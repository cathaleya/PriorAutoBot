import "dotenv/config";
import blessed from "blessed";
import figlet from "figlet";
import { ethers } from "ethers";
import { HttpsProxyAgent } from 'https-proxy-agent';

// Load environment variables
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEYS = process.env.PRIVATE_KEY.split(',');
const PROXIES = process.env.PROXY ? process.env.PROXY.split(',') : [];
const USDC_ADDRESS = "0x109694D75363A75317A8136D80f50F871E81044e";
const USDT_ADDRESS = "0x014397DaEa96CaC46DbEdcbce50A42D5e0152B2E";
const PRIOR_ADDRESS = "0xc19Ec2EEBB009b2422514C51F9118026f1cD89ba";
const routerAddress = "0x0f1DADEcc263eB79AE3e4db0d57c49a8b6178B0B";
const FAUCET_ADDRESS = "0xCa602D9E45E1Ed25105Ee43643ea936B8e2Fd6B7";
const NETWORK_NAME = "PRIOR TESTNET";

// Store wallet info for each wallet
let walletsInfo = PRIVATE_KEYS.map((_, index) => ({
  index: index + 1,
  address: "",
  balanceETH: "0.00",
  balancePrior: "0.00",
  balanceUSDC: "0.00",
  balanceUSDT: "0.00",
  network: "Prior Testnet",
  status: "Initializing",
  proxy: PROXIES[index] || null
}));

let currentWalletIndex = 0;
let transactionLogs = [];
let priorSwapRunning = false;
let priorSwapCancelled = false;
let globalWallets = [];

// Function to create provider with proxy
function createProvider() {
  const currentWallet = walletsInfo[currentWalletIndex];
  if (currentWallet.proxy) {
    const proxyAgent = new HttpsProxyAgent(currentWallet.proxy);
    return new ethers.JsonRpcProvider(RPC_URL, null, { agent: proxyAgent });
  }
  return new ethers.JsonRpcProvider(RPC_URL);
}

// ... [keep all the existing functions like getShortAddress, addLog, etc] ...

async function updateWalletData() {
  try {
    const provider = createProvider();
    const wallet = new ethers.Wallet(PRIVATE_KEYS[currentWalletIndex], provider);
    globalWallets[currentWalletIndex] = wallet;
    walletsInfo[currentWalletIndex].address = wallet.address;

    const [ethBalance, balancePrior, balanceUSDC, balanceUSDT] = await Promise.all([
      provider.getBalance(wallet.address),
      new ethers.Contract(PRIOR_ADDRESS, ERC20_ABI, provider).balanceOf(wallet.address),
      new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider).balanceOf(wallet.address),
      new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider).balanceOf(wallet.address)
    ]);

    walletsInfo[currentWalletIndex].balanceETH = ethers.formatEther(ethBalance);
    walletsInfo[currentWalletIndex].balancePrior = ethers.formatEther(balancePrior);
    walletsInfo[currentWalletIndex].balanceUSDC = ethers.formatUnits(balanceUSDC, 6);
    walletsInfo[currentWalletIndex].balanceUSDT = ethers.formatUnits(balanceUSDT, 6);

    updateWallet();
    addLog(`Saldo Wallet ${currentWalletIndex + 1} Updated! Proxy: ${walletsInfo[currentWalletIndex].proxy || 'None'}`, "system");
  } catch (error) {
    addLog(`Gagal mengambil data wallet ${currentWalletIndex + 1}: ${error.message}`, "system");
  }
}

// ... [keep all other existing functions, but replace all instances of new ethers.JsonRpcProvider with createProvider()] ...

// Update wallet display to show proxy info
function updateWallet() {
  const currentWallet = walletsInfo[currentWalletIndex];
  const shortAddress = currentWallet.address ? getShortAddress(currentWallet.address) : "N/A";
  const prior = currentWallet.balancePrior ? Number(currentWallet.balancePrior).toFixed(2) : "0.00";
  const usdc = currentWallet.balanceUSDC ? Number(currentWallet.balanceUSDC).toFixed(2) : "0.00";
  const usdt = currentWallet.balanceUSDT ? Number(currentWallet.balanceUSDT).toFixed(2) : "0.00";
  const eth = currentWallet.balanceETH ? Number(currentWallet.balanceETH).toFixed(4) : "0.000";
  const proxyInfo = currentWallet.proxy ? `\n└── Proxy    : {bright-blue-fg}${currentWallet.proxy.split('@')[1] || currentWallet.proxy}{/bright-blue-fg}` : '';

  const content = `┌── Wallet  : {bright-yellow-fg}${currentWallet.index}{/bright-yellow-fg}
└── Address : {bright-yellow-fg}${shortAddress}{/bright-yellow-fg}
│   ├── ETH     : {bright-green-fg}${eth}{/bright-green-fg}
│   ├── PRIOR   : {bright-green-fg}${prior}{/bright-green-fg}
│   ├── USDC    : {bright-green-fg}${usdc}{/bright-green-fg}
│   └── USDT    : {bright-green-fg}${usdt}{/bright-green-fg}
└── Network     : {bright-cyan-fg}${NETWORK_NAME}{/bright-cyan-fg}${proxyInfo}
`;

  walletBox.setContent(content);
  safeRender();
}

// ... [rest of your existing code] ...

// Initialize global wallets array with proxy support
globalWallets = PRIVATE_KEYS.map((key, index) => {
  const provider = walletsInfo[index].proxy 
    ? new ethers.JsonRpcProvider(RPC_URL, null, { agent: new HttpsProxyAgent(walletsInfo[index].proxy) })
    : new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Wallet(key, provider);
});

safeRender();
mainMenu.focus();
updateAllWalletsData();
updateLogs();
