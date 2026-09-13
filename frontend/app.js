(function (global) {
  const cfg = global.CARPASSPORT_CONFIG;

  function truncateAddress(addr) {
    if (!addr || addr.length < 12) return addr || "";
    return addr.slice(0, 6) + "…" + addr.slice(-4);
  }

  function explorerBase(chainId) {
    const n = Number(chainId);
    if (n === cfg.amoy.chainId) return cfg.amoy.explorer;
    if (n === cfg.sepolia.chainId) return cfg.sepolia.explorer;
    return null;
  }

  function explorerAddressUrl(chainId, address) {
    const base = explorerBase(chainId);
    return base ? `${base}/address/${address}` : null;
  }

  function networkName(chainId) {
    const n = Number(chainId);
    if (n === cfg.amoy.chainId) return cfg.amoy.name;
    if (n === cfg.sepolia.chainId) return cfg.sepolia.name;
    if (n === cfg.localhost.chainId) return cfg.localhost.name;
    return `Chain ${n}`;
  }

  function resolveAddressAndChain() {
    const deployed = (typeof global.CARPASSPORT_DEPLOYED_ADDRESS === "string"
      ? global.CARPASSPORT_DEPLOYED_ADDRESS
      : ""
    ).trim();

    const amoy = (typeof global.CARPASSPORT_AMOY_ADDRESS === "string"
      ? global.CARPASSPORT_AMOY_ADDRESS
      : ""
    ).trim();

    // 1. Prioritize active local deployment address if non-empty
    if (deployed) {
      return {
        address: deployed,
        chainId: Number(global.CARPASSPORT_DEPLOYED_CHAIN_ID || cfg.localhost.chainId),
        source: "deploy",
      };
    }

    // 2. Fallback: check for non-empty CARPASSPORT_AMOY_ADDRESS when CARPASSPORT_DEPLOYED_ADDRESS is unset or empty
    if (amoy) {
      return {
        address: amoy,
        chainId: cfg.amoy.chainId,
        source: "amoy",
      };
    }

    return { address: "", chainId: 0, source: "none" };
  }

  function rpcForChain(chainId) {
    const n = Number(chainId);
    if (n === cfg.amoy.chainId) return cfg.amoy.rpcUrl;
    if (n === cfg.sepolia.chainId) return cfg.sepolia.rpcUrl;
    if (n === cfg.localhost.chainId) return cfg.localhost.rpcUrl;
    return cfg.amoy.rpcUrl;
  }

  function getReadProvider() {
    const { chainId } = resolveAddressAndChain();
    if (!chainId) {
      throw new Error("No contract address. Deploy first (npm run deploy:localhost or deploy:amoy).");
    }
    return new ethers.JsonRpcProvider(rpcForChain(chainId), chainId);
  }

  function getReadContract() {
    const { address } = resolveAddressAndChain();
    if (!address) {
      throw new Error("No contract address. Deploy first (npm run deploy:localhost or deploy:amoy).");
    }
    if (!global.CARPASSPORT_ABI) {
      throw new Error("ABI missing. Run a Hardhat deploy so frontend/abi.js is generated.");
    }
    return new ethers.Contract(address, global.CARPASSPORT_ABI, getReadProvider());
  }

  async function getSignerContract() {
    if (!global.ethereum) {
      throw new Error("MetaMask is not installed.");
    }
    const { address } = resolveAddressAndChain();
    if (!address || !global.CARPASSPORT_ABI) {
      throw new Error("Contract not configured. Deploy and refresh this page.");
    }
    const provider = new ethers.BrowserProvider(global.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(address, global.CARPASSPORT_ABI, signer);
  }

  function decodeContractError(err) {
    const iface = global.CARPASSPORT_ABI
      ? new ethers.Interface(global.CARPASSPORT_ABI)
      : null;

    const candidates = [
      err?.data,
      err?.error?.data,
      err?.info?.error?.data,
      err?.receipt?.revertReason,
    ];

    let data = candidates.find((d) => typeof d === "string" && d.startsWith("0x"));
    if (!data && err?.data && typeof err.data === "object" && err.data.data) {
      data = err.data.data;
    }

    if (iface && data && data !== "0x") {
      try {
        const parsed = iface.parseError(data);
        if (parsed) {
          if (parsed.name === "OdometerRollback") {
            const provided = parsed.args[0].toString();
            const last = parsed.args[1].toString();
            return `Odometer rollback: provided ${provided} is below last recorded ${last}. The chain rejected this write.`;
          }
          if (parsed.name === "UnrealisticMileageJump") {
            const attempted = parsed.args[0].toString();
            const max = parsed.args[1].toString();
            return `Unrealistic mileage jump: ${attempted} miles is too high (> 50,000 increase). This was blocked as a potential data-entry error.`;
          }
          if (parsed.name === "NotAuthorized") {
            return "Not authorized: this wallet is not an approved mechanic workshop.";
          }
          if (parsed.name === "NotVehicleOwner") {
            return "Not title owner: Only the current Digital Title holder can transfer this vehicle NFT.";
          }
          if (parsed.name === "NotOwner") {
            return "Not admin: only the protocol owner can authorize new mechanics.";
          }
          if (parsed.name === "EmptyVIN") {
            return "Empty VIN: the contract requires a non-empty VIN string.";
          }
          if (parsed.name === "ZeroAddress") {
            return "Zero address is not allowed.";
          }
          return parsed.name;
        }
      } catch {
        /* fall through */
      }
    }

    const msg = err?.shortMessage || err?.reason || err?.message || String(err);
    if (/OdometerRollback/i.test(msg)) {
      return "Odometer rollback: the provided mileage is below the last recorded value.";
    }
    if (/UnrealisticMileageJump/i.test(msg)) {
      return "Unrealistic mileage jump: the provided mileage increases by more than 50,000 miles.";
    }
    if (/NotAuthorized/i.test(msg)) {
      return "Not authorized: this wallet is not an approved mechanic.";
    }
    if (/user rejected|ACTION_REJECTED/i.test(msg)) {
      return "Transaction rejected in the wallet.";
    }
    return msg;
  }

  function showBanner(el, type, text, extraHtml) {
    if (!el) return;
    el.className = "banner banner-" + type;
    el.hidden = false;
    el.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = text;
    el.appendChild(p);
    if (extraHtml) {
      const wrap = document.createElement("div");
      wrap.innerHTML = extraHtml;
      el.appendChild(wrap);
    }
    if (global.CarPassportAnimations && global.CarPassportAnimations.animateBanner) {
      global.CarPassportAnimations.animateBanner(el, type);
    }
  }

  function hideBanner(el) {
    if (!el) return;
    el.hidden = true;
    el.innerHTML = "";
    el.className = "banner";
  }

  function formatTs(unix) {
    const n = Number(unix);
    if (!n) return "—";
    return new Date(n * 1000).toLocaleString();
  }

  function paintNetworkBadge(el) {
    if (!el) return;
    const { address, chainId } = resolveAddressAndChain();
    const name = chainId ? networkName(chainId) : "Not deployed";
    el.innerHTML = "";

    const pill = document.createElement("span");
    pill.className = "neo-badge";
    pill.textContent = "Network: " + name;
    el.appendChild(pill);

    if (address) {
      const url = explorerAddressUrl(chainId, address);
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "font-bold underline ml-2";
        a.textContent = (chainId === 11155111) ? "Etherscan" : "PolygonScan";
        el.appendChild(a);
      } else {
        const span = document.createElement("span");
        span.className = "mono font-bold ml-2";
        span.textContent = truncateAddress(address);
        el.appendChild(span);
      }
    }
  }

  async function ensureWalletChain() {
    const { chainId } = resolveAddressAndChain();
    if (!chainId || !global.ethereum) return;

    const hex =
      chainId === cfg.amoy.chainId
        ? cfg.amoy.hexChainId
        : chainId === cfg.localhost.chainId
          ? cfg.localhost.hexChainId
          : "0x" + chainId.toString(16);

    const current = await global.ethereum.request({ method: "eth_chainId" });
    if (current.toLowerCase() === hex.toLowerCase()) return;

    try {
      await global.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hex }],
      });
    } catch (switchErr) {
      if (switchErr.code === 4902 && chainId === cfg.amoy.chainId) {
        await global.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: cfg.amoy.hexChainId,
              chainName: cfg.amoy.name,
              nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
              rpcUrls: [cfg.amoy.rpcUrl],
              blockExplorerUrls: [cfg.amoy.explorer],
            },
          ],
        });
        return;
      }
      if (switchErr.code === 4902 && chainId === cfg.sepolia.chainId) {
        await global.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: cfg.sepolia.hexChainId,
              chainName: cfg.sepolia.name,
              nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: [cfg.sepolia.rpcUrl],
              blockExplorerUrls: [cfg.sepolia.explorer],
            },
          ],
        });
        return;
      }
      if (switchErr.code === 4902 && chainId === cfg.localhost.chainId) {
        await global.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: cfg.localhost.hexChainId,
              chainName: cfg.localhost.name,
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: [cfg.localhost.rpcUrl],
            },
          ],
        });
        return;
      }
      throw switchErr;
    }
  }

  global.CarPassportApp = {
    truncateAddress,
    explorerAddressUrl,
    networkName,
    resolveAddressAndChain,
    getReadProvider,
    getReadContract,
    getSignerContract,
    decodeContractError,
    showBanner,
    hideBanner,
    formatTs,
    paintNetworkBadge,
    ensureWalletChain,
  };
})(window);
