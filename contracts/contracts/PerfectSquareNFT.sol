// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PerfectSquareNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    constructor() ERC721("Perfect Square NFT", "PSQ") Ownable(msg.sender) {}

    function mint(address player, string memory tokenURI)
        public
        returns (uint256)
    {
        _tokenIds += 1;

        uint256 newItemId = _tokenIds;
        _mint(player, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }
}
