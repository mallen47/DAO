//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import 'hardhat/console.sol';
import './Token.sol';

contract DAO {
    address owner;
    Token public token;
    uint256 public quorum;
    uint256 public proposalCount;

    mapping(uint256 => Proposal) public proposals;
    // nested mapping keeps track of 'has voted' status for each investor
    mapping(address => mapping(uint256 => bool)) votes;

    struct Proposal {
        uint256 id;
        string name;
        uint256 amount;
        address payable recipient;
        uint256 votes;
        bool finalized;
    }

    event Propose(uint id, uint256 amount, address recipient, address creator);
    event Vote(uint256 id, address investor);
    event Finalize(uint256 id);

    constructor(Token _token, uint256 _quorum) {
        owner = msg.sender;
        token = _token;
        quorum = _quorum;
    }

    // Allow contract to receive ether
    receive() external payable {}

    modifier onlyInvestor() {
        require(token.balanceOf(msg.sender) > 0, 'must be token holder');
        _;
    }

    function createProposal(
        string memory _name,
        uint256 _amount,
        address payable _recipient
    ) external onlyInvestor {
        require(address(this).balance >= _amount);

        proposalCount++;
        proposals[proposalCount] = Proposal(
            proposalCount,
            _name,
            _amount,
            _recipient,
            0,
            false
        );
        emit Propose(proposalCount, _amount, _recipient, msg.sender);
    }

    function vote(uint256 _id) external onlyInvestor {
        // fetch proposal from mapping by id
        Proposal storage proposal = proposals[_id];

        // don't let investors vote twice
        require(!votes[msg.sender][_id], 'Already voted!');

        // update votes
        proposal.votes += token.balanceOf(msg.sender);

        // track that user has voted
        votes[msg.sender][_id] = true;

        // emit an event
        emit Vote(_id, msg.sender);
    }

    function finalizeProposal(uint256 _id) external onlyInvestor {
        // fetch proposal
        Proposal storage proposal = proposals[_id];

        // Ensure proposal is not already finalized
        require(proposal.finalized == false, 'proposal already finalized');

        // mark proposal as finalized
        proposal.finalized = true;

        // check that proposal has enough votes
        require(
            proposal.votes >= quorum,
            'must reach quorom to finalize proposal'
        );

        // prior to transfering funds, verify contract still holds enough ether
        require(address(this).balance >= proposal.amount);

        // transfer funds
        (bool sent, ) = proposal.recipient.call{value: proposal.amount}('');
        require(sent);

        // emit event
        emit Finalize(_id);
    }
}
