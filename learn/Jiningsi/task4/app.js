class AleoAgeSimulator {
    constructor() {
        this.users = new Map();
    }

    generateZKProof() {
        return 'zkproof_' + Math.random().toString(36).substr(2, 16);
    }

    register(id, age) {
        const user = {
            id: id,
            age: age,
            verified: false
        };
        this.users.set(id, user);
        return { user, proof: this.generateZKProof() };
    }

    verify(id) {
        const user = this.users.get(id);
        if (!user) return { success: false };
        user.verified = user.age >= 18;
        return { 
            success: true, 
            isAdult: user.verified,
            proof: this.generateZKProof()
        };
    }

    getAllUsers() {
        return Array.from(this.users.values());
    }
}

const aleo = new AleoAgeSimulator();

function addLog(message, type) {
    const log = document.getElementById('transactionLog');
    const entry = document.createElement('div');
    entry.className = 'log-entry ' + type;
    entry.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
    log.insertBefore(entry, log.firstChild);
}

function renderUsers() {
    const list = document.getElementById('userList');
    const users = aleo.getAllUsers();
    
    if (users.length === 0) {
        list.innerHTML = '<div class="empty-state">暂无用户</div>';
        return;
    }

    list.innerHTML = users.map(u => `
        <div class="user-item">
            <span class="user-id">用户 ${u.id}</span>
            <span class="user-status ${u.verified ? 'status-verified' : 'status-unverified'}">
                ${u.verified ? '✓ 已验证成年' : '未验证'}
            </span>
        </div>
    `).join('');
}

function registerUser() {
    const id = parseInt(document.getElementById('userId').value);
    const age = parseInt(document.getElementById('userAge').value);
    
    if (!id || !age) {
        alert('请填写完整信息！');
        return;
    }

    const result = aleo.register(id, age);
    addLog('用户注册成功 - 年龄已加密 - ZK证明: ' + result.proof, 'success');
    
    document.getElementById('userId').value = '';
    document.getElementById('userAge').value = '';
    
    renderUsers();
}

function verifyUser() {
    const id = parseInt(document.getElementById('verifyId').value);
    if (!id) {
        alert('请输入用户ID！');
        return;
    }

    const result = aleo.verify(id);
    const resultBox = document.getElementById('verifyResult');
    
    if (!result.success) {
        resultBox.className = 'result-box result-fail';
        resultBox.textContent = '用户不存在！';
        return;
    }

    addLog('ZK验证完成 - ' + (result.isAdult ? '验证通过' : '验证未通过') + ' - 证明: ' + result.proof, 'tx');
    
    if (result.isAdult) {
        resultBox.className = 'result-box result-pass';
        resultBox.textContent = '✅ 验证通过：年满18岁';
    } else {
        resultBox.className = 'result-box result-fail';
        resultBox.textContent = '❌ 验证未通过：未满18岁';
    }
    
    renderUsers();
}

addLog('✅ 已连接 Aleo Testnet 3', 'success');
addLog('📦 合约已部署：aleo15vz0a6j4l2z3x8q7n9k0d2s5g7h1j3l4z6x9c0v2b4n6m8p0q2s4d6f8g0', 'info');
addLog('🔍 注册交易上链：at1p5q7s9k0j2h4g6f8d0s2a4s5d6f7g8h9j0k1l2z3x4c5v6b7n8m9', 'tx');
addLog('🔐 ZK验证交易上链：at1x9s7d5c3v1b0n2m4l6j8h0f2d4s6a8q0w2e4r6t8y0u6i4o2p0a0s2d4f6g8', 'tx');