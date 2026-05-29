import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import AleoWalletProviderWrapper from "./WalletProvider.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AleoWalletProviderWrapper>
      <App />
    </AleoWalletProviderWrapper>
  </React.StrictMode>,
);
