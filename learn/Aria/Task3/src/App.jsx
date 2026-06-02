import React, { useState, useEffect } from 'react';
import votingProgram from '../voting-app/build/main.aleo?raw';

function App() {
  const [account, setAccount] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [newProposalTitle, setNewProposalTitle] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [status, setStatus] = useState('');

  // 创建新账户
  const handleCreateAccount = async () => {
    const worker = new Worker(new URL('./workers/worker.js', import.meta.url));
    worker.postMessage({ type: 'createAccount' });
    worker.onmessage = (e) => {
      setAccount(e.data);
      setStatus('账户创建成功！请保存私钥');
      worker.terminate();
    };
  };

  // 创建提案
  const handleCreateProposal = async () => {
    if (!account) {
      setStatus('请先创建账户');
      return;
    }

    // 将标题转换为field类型（简单哈希）
    const titleHash = stringToField(newProposalTitle);
    
    const worker = new Worker(new URL('./workers/worker.js', import.meta.url));
    worker.postMessage({
      type: 'execute',
      data: {
        program: votingProgram,
        function: 'create_proposal',
        inputs: [titleHash],
        privateKey: account.privateKey
      }
    });
    
    worker.onmessage = (e) => {
      if (e.data.success) {
        setStatus(`提案 "${newProposalTitle}" 创建成功！`);
        setNewProposalTitle('');
      } else {
        setStatus(`创建失败：${e.data.error}`);
      }
      worker.terminate();
    };
  };

  // 投票
  const handleVote = async (proposalId, voteInFavor) => {
    if (!account) {
      setStatus('请先创建账户');
      return;
    }

    // 首先需要获取或创建选票（简化示例：自动创建）
    // 完整实现需要先调用issue_ballot函数
    
    const worker = new Worker(new URL('./workers/worker.js', import.meta.url));
    worker.postMessage({
      type: 'execute',
      data: {
        program: votingProgram,
        function: 'vote',
        inputs: [`{ owner: ${account.address}, proposal_id: ${proposalId}, has_voted: false }`, proposalId.toString(), voteInFavor.toString()],
        privateKey: account.privateKey
      }
    });
    
    worker.onmessage = (e) => {
      if (e.data.success) {
        setStatus(`投票成功！${voteInFavor ? '赞成' : '反对'} ${proposalId}`);
      } else {
        setStatus(`投票失败：${e.data.error}`);
      }
      worker.terminate();
    };
  };

  // 工具函数：简单哈希
  function stringToField(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString() + "field";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* 导航栏 */}
      <nav className="bg-gray-800 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            🔒 隐私投票应用
          </h1>
          <p className="text-gray-400 text-sm mt-1">基于零知识证明的匿名投票系统</p>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* 账户管理 */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8 shadow-xl">
          <h2 className="text-xl font-semibold mb-4">👤 账户管理</h2>
          {!account ? (
            <button
              onClick={handleCreateAccount}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition"
            >
              创建新账户
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-green-400">✓ 账户已创建</p>
              <p className="text-gray-400 text-sm break-all">
                地址：{account.address}
              </p>
              <p className="text-yellow-400 text-sm">
                ⚠️ 请保存私钥：{account.privateKey.substring(0, 20)}...
              </p>
            </div>
          )}
        </div>

        {/* 创建提案 */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8 shadow-xl">
          <h2 className="text-xl font-semibold mb-4">📝 创建新提案</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newProposalTitle}
              onChange={(e) => setNewProposalTitle(e.target.value)}
              placeholder="输入提案标题..."
              className="flex-1 bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCreateProposal}
              disabled={!account || !newProposalTitle}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              发布提案
            </button>
          </div>
        </div>

        {/* 提案列表 */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-4">🗳️ 活跃提案</h2>
          
          {/* 示例提案数据 - 实际应从链上获取 */}
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">提案 #1：增加社区基金预算</h3>
                  <p className="text-gray-400 text-sm">状态：投票中</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400">赞成：25</p>
                  <p className="text-red-400">反对：10</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleVote(1, true)}
                  disabled={!account}
                  className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg font-medium transition disabled:opacity-50"
                >
                  👍 赞成
                </button>
                <button
                  onClick={() => handleVote(1, false)}
                  disabled={!account}
                  className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-medium transition disabled:opacity-50"
                >
                  👎 反对
                </button>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">提案 #2：技术路线图更新</h3>
                  <p className="text-gray-400 text-sm">状态：投票中</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400">赞成：42</p>
                  <p className="text-red-400">反对：8</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleVote(2, true)}
                  disabled={!account}
                  className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg font-medium transition disabled:opacity-50"
                >
                  👍 赞成
                </button>
                <button
                  onClick={() => handleVote(2, false)}
                  disabled={!account}
                  className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-medium transition disabled:opacity-50"
                >
                  👎 反对
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-300">
              🔐 隐私说明：投票使用零知识证明技术，您的投票行为不会与您的身份关联。
              系统仅验证您持有有效选票，但无法知道是谁投给了哪个选项。
            </p>
          </div>
        </div>

        {/* 状态提示 */}
        {status && (
          <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 shadow-lg">
            <p className="text-sm">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;