# Task 3 - 建起来：从程序到 dApp 

基于 Leo 和前端完成一个可交互的隐私小应用, 请提交代码文件和demo截图。



隐私投票应用
技术栈
Leo语言：编写零知识证明电路，实现匿名投票逻辑

React + Vite：构建前端交互界面

Provable SDK：在浏览器中执行Leo程序，生成并验证零知识证明

核心功能
创建提案：任何人都可以发起一个新提案

匿名投票：持有有效选票的用户可以投票，但投票行为与身份完全解绑

结果公开：投票结果实时更新并在链上公开，保证透明度

# 使用cargo安装Leo（需要先安装Rust）
cargo install leo-lang

# 验证安装
leo --version

# 创建项目
npm create leo-app@latest private-voting-app
cd private-voting-app

# 安装依赖
npm install
npm run install-leo

# 启动开发服务器
npm run dev