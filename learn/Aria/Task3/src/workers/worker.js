import { initializeWasm, Account, ProgramManager, AleoNetworkClient } from '@provablehq/sdk';

let programManager = null;
let initialized = false;

// 初始化Wasm
async function init() {
    if (initialized) return;
    await initializeWasm();
    initialized = true;
}

// 创建新账户
export async function createAccount() {
    await init();
    const account = new Account();
    return {
        address: account.address().to_string(),
        privateKey: account.privateKey().to_string(),
        viewKey: account.viewKey().to_string()
    };
}

// 执行投票程序
export async function executeVote(programString, functionName, inputs, privateKey) {
    await init();
    
    const account = new Account({ privateKey });
    const networkClient = new AleoNetworkClient("https://api.provable.com/v2");
    
    programManager = new ProgramManager();
    programManager.setAccount(account);
    
    try {
        // 离线执行，在浏览器本地生成ZK证明
        const response = await programManager.executeOffline(
            programString,
            functionName,
            inputs
        );
        return {
            success: true,
            outputs: response.getOutputs()
        };
    } catch (error) {
        console.error("Execution failed:", error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 部署程序
export async function deployProgram(programString, privateKey) {
    await init();
    
    const account = new Account({ privateKey });
    programManager = new ProgramManager("https://api.provable.com/v2");
    programManager.setAccount(account);
    
    try {
        const txId = await programManager.deploy(programString, 0.1);
        return { success: true, transactionId: txId };
    } catch (error) {
        return { success: false, error: error.message };
    }
}