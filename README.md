# Rare Friends

Real-time randomness for onchain applications.

Every request pays **1 $RAREFRIENDS**. The contract sends **100%** of that fee to Rare Friends rewards. The keeper cut is **0**. There is no second coin.

## How a reveal works

1. The caller submits 32 bytes of their own randomness and pays the fee.
2. The keeper reveals the next preimage of a committed Keccak256 hash chain.
3. The word is `keccak256(userRandom ‖ providerReveal)`.

A finished reveal can be checked by anyone. The keeper cannot swap the preimage, because Keccak256 of it has to match the published commitment.

## Contract

[`public/RareFriendsEntropy.sol`](public/RareFriendsEntropy.sol)

`request` pulls the fee with `transferFrom` straight to the rewards address. This contract never holds the fee.

The contract is ready to deploy. It does not have a public-chain address yet.

## App

```bash
npm install
npm run dev
```

The dev server runs at `http://127.0.0.1:8080`.

Other projects call the same keeper. Use a project slug such as `rare-friends` or your own. The fee and the rewards sink stay the same.
