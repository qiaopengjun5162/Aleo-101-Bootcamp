// Aleo 网络模拟层 - 完整的隐私投票逻辑
class AleoSimulator {
    constructor() {
        this.proposals = new Map();
        this.proposalId = 0;
        this.totalVotes = 0;
    }

    generateZKProof() {
        return 'zkproof_' + Math.random().toString(36).substr(2, 16);
    }

    propose(title, description) {
        this.proposalId++;
        const proposal = {
            id: this.proposalId,
            title: title,
            description: description,
            agree_count: 0,
            disagree_count: 0,
            active: true,
            createdAt: new Date().toLocaleString()
        };
        this.proposals.set(this.proposalId, proposal);
        return { proposal: proposal, proof: this.generateZKProof() };
    }

    agree(id) {
        const proposal = this.proposals.get(id);
        if (proposal) {
            proposal.agree_count++;
            this.totalVotes++;
        }
        return { success: true, proof: this.generateZKProof() };
    }

    disagree(id) {
        const proposal = this.proposals.get(id);
        if (proposal) {
            proposal.disagree_count++;
            this.totalVotes++;
        }
        return { success: true, proof: this.generateZKProof() };
    }

    getAllProposals() {
        return Array.from(this.proposals.values());
    }
}

const aleo = new AleoSimulator();

function addLog(message, type) {
    const log = document.getElementById('transactionLog');
    const entry = document.createElement('div');
    entry.className = 'log-entry ' + type;
    entry.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
    log.insertBefore(entry, log.firstChild);
}

function updateStats() {
    document.getElementById('totalProposals').textContent = aleo.proposalId;
    document.getElementById('totalVotes').textContent = aleo.totalVotes;
}

function renderProposals() {
    const list = document.getElementById('proposalList');
    const proposals = aleo.getAllProposals();
    
    if (proposals.length === 0) {
        list.innerHTML = '<div class="empty-state">暂无提案，创建第一个吧！</div>';
        return;
    }

    let html = '';
    for (let i = 0; i < proposals.length; i++) {
        const p = proposals[i];
        const total = p.agree_count + p.disagree_count;
        let agreePercent = 50;
        if (total > 0) {
            agreePercent = (p.agree_count / total * 100);
        }
        
        html += '<div class="proposal-item">';
        html += '<div class="proposal-title">' + p.title + '</div>';
        html += '<div class="proposal-desc">' + p.description + '</div>';
        html += '<div class="proposal-results">';
        html += '<span style="color: #48bb78">赞成: ' + p.agree_count + '</span>';
        html += '<span style="color: #f56565">反对: ' + p.disagree_count + '</span>';
        html += '</div>';
        html += '<div class="result-bar">';
        html += '<div class="result-fill" style="width: ' + agreePercent + '%"></div>';
        html += '</div>';
        html += '<div>';
        html += '<button class="btn btn-agree" onclick="vote(' + p.id + ', \'agree\')">赞成</button>';
        html += '<button class="btn btn-disagree" onclick="vote(' + p.id + ', \'disagree\')">反对</button>';
        html += '</div>';
        html += '</div>';
    }
    list.innerHTML = html;
}

function createProposal() {
    const title = document.getElementById('proposalTitle').value;
    const desc = document.getElementById('proposalDesc').value;
    
    if (!title || !desc) {
        alert('请填写完整信息！');
        return;
    }

    const result = aleo.propose(title, desc);
    addLog('提案创建成功 - ZK证明: ' + result.proof, 'success');
    
    document.getElementById('proposalTitle').value = '';
    document.getElementById('proposalDesc').value = '';
    
    renderProposals();
    updateStats();
}

function vote(id, type) {
    let result;
    if (type === 'agree') {
        result = aleo.agree(id);
        addLog('赞成票已提交 - ZK证明: ' + result.proof, 'tx');
    } else {
        result = aleo.disagree(id);
        addLog('反对票已提交 - ZK证明: ' + result.proof, 'tx');
    }
    
    renderProposals();
    updateStats();
}

addLog('Aleo 隐私投票 dApp 已启动', 'success');