// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title RareFriendsEntropy
/// @notice Shared RNG. Callers pay $RAREFRIENDS. The entire fee is pulled
///         straight to the Rare Friends rewards address. This contract keeps nothing.
///         There is no second token.
contract RareFriendsEntropy {
    address public immutable provider;
    IERC20 public immutable rarefriends;
    address public immutable rewards;
    bytes32 public commitment;
    bytes32 public immutable root;
    uint64 public nextSequence;
    uint64 public revealCursor;
    uint256 public immutable fee;
    mapping(uint64 => bytes32) public userRandomOf;

    event Requested(uint64 indexed sequence, address indexed requester, bytes32 userRandom, uint256 fee);
    event Revealed(uint64 indexed sequence, bytes32 providerReveal, bytes32 randomNumber);

    error BadFee();
    error NotProvider();
    error BadSequence();
    error BadReveal();
    error ZeroAddress();

    constructor(address provider_, bytes32 root_, address rarefriends_, address rewards_, uint256 fee_) {
        if (provider_ == address(0) || rarefriends_ == address(0) || rewards_ == address(0)) revert ZeroAddress();
        if (fee_ == 0) revert BadFee();
        provider = provider_;
        root = root_;
        commitment = root_;
        rarefriends = IERC20(rarefriends_);
        rewards = rewards_;
        fee = fee_;
    }

    function request(bytes32 userRandom) external payable returns (uint64 sequence) {
        if (msg.value != 0) revert BadFee();
        if (!rarefriends.transferFrom(msg.sender, rewards, fee)) revert BadFee();
        sequence = nextSequence;
        nextSequence = sequence + 1;
        userRandomOf[sequence] = userRandom;
        emit Requested(sequence, msg.sender, userRandom, fee);
    }

    function reveal(uint64 sequence, bytes32 userRandom, bytes32 providerReveal) external {
        if (msg.sender != provider) revert NotProvider();
        if (sequence != revealCursor || sequence >= nextSequence) revert BadSequence();
        if (userRandom != userRandomOf[sequence]) revert BadReveal();
        if (keccak256(abi.encodePacked(providerReveal)) != commitment) revert BadReveal();
        bytes32 randomNumber = keccak256(abi.encodePacked(userRandom, providerReveal));
        commitment = providerReveal;
        revealCursor = sequence + 1;
        emit Revealed(sequence, providerReveal, randomNumber);
    }
}
