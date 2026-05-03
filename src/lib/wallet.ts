import { BrowserProvider, ethers, type JsonRpcSigner, type Provider } from 'ethers'

function requireEthereum() {
  if (typeof window === 'undefined') throw new Error('Wallet unavailable in this environment.')
  const eth = window.ethereum
  if (!eth?.request) throw new Error('No injected wallet detected (install MetaMask).')
  return eth
}

export async function connectBrowserWallet(): Promise<{
  signer: JsonRpcSigner
  provider: BrowserProvider
  account: string
  chainId: bigint
}> {
  const ethereum = requireEthereum()
  const provider = new BrowserProvider(ethereum)
  await provider.send('eth_requestAccounts', [])
  const network = await provider.getNetwork()
  const signer = await provider.getSigner()
  const account = await signer.getAddress()
  const chainId = network.chainId
  return { signer, provider, account, chainId }
}

const MIN_GAS_BUFFER_WEI = 1_000_000_000_000_000n // 0.001 ETH

async function estimateMaxEthValue(provider: Provider, from: string, gasLimitHint = 21_000n) {
  const balance = await provider.getBalance(from)
  const fee = await provider.getFeeData()

  let maxFeePerGas = fee.maxFeePerGas ?? fee.gasPrice
  if (!maxFeePerGas) {
    throw new Error('Unable to estimate gas pricing for this chain.')
  }

  // Keep a bigger cushion so emergency send never drains the account too close to zero.
  maxFeePerGas = (maxFeePerGas * 200n) / 100n
  const dynamicReserve = gasLimitHint * maxFeePerGas
  const reserve = dynamicReserve > MIN_GAS_BUFFER_WEI ? dynamicReserve : MIN_GAS_BUFFER_WEI
  const value = balance > reserve ? balance - reserve : 0n

  if (value <= 0n) {
    throw new Error('Insufficient balance to cover SOS transfer after gas.')
  }

  return { value }
}

export async function sendEmergencyEthTransfer(opts: {
  signer: JsonRpcSigner
  provider: Provider
  toChecksummed: string
}) {
  const { signer, provider } = opts
  const from = await signer.getAddress()
  const { value } = await estimateMaxEthValue(provider, from)
  const tx = await signer.sendTransaction({ to: opts.toChecksummed, value })
  const receipt = await tx.wait()
  if (!receipt) throw new Error('Transaction confirmed without receipt.')

  const network = await provider.getNetwork()
  return {
    transferTxHash: receipt.hash,
    chainId: network.chainId.toString(),
  }
}

export function normalizeAddress(input: string) {
  return ethers.getAddress(input.trim())
}
