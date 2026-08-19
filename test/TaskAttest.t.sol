// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/TaskAttest.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {
        _mint(msg.sender, 1_000_000e18);
    }
}

contract TaskAttestTest is Test {
    TaskAttest taskAttest;
    MockUSDT usdt;

    address admin = address(0xA11CE);
    address aiOracle = address(0x0A1);
    address poster = address(0xB0B);
    address worker = address(0xC0DE);

    function setUp() public {
        usdt = new MockUSDT();

        vm.prank(admin);
        taskAttest = new TaskAttest(address(usdt), admin);

        bytes32 oracleRole = taskAttest.AI_ORACLE_ROLE();
        vm.prank(admin);
        taskAttest.grantRole(oracleRole, aiOracle);

        usdt.transfer(poster, 10_000e18);
    }

    function _createAndDeliver(uint256 reward) internal returns (uint256 taskId) {
        vm.startPrank(poster);
        usdt.approve(address(taskAttest), reward);
        taskId = taskAttest.createTask("ipfs://spec", reward);
        vm.stopPrank();

        vm.prank(worker);
        taskAttest.submitDeliverable(taskId, "ipfs://deliverable");
    }

    function testCreateTaskPullsFunds() public {
        vm.startPrank(poster);
        usdt.approve(address(taskAttest), 100e18);
        uint256 taskId = taskAttest.createTask("ipfs://spec", 100e18);
        vm.stopPrank();

        (address p,,uint256 reward,,,,, TaskAttest.Status status,) = taskAttest.tasks(taskId);
        assertEq(p, poster);
        assertEq(reward, 100e18);
        assertEq(uint8(status), uint8(TaskAttest.Status.Open));
        assertEq(usdt.balanceOf(address(taskAttest)), 100e18);
    }

    function testHighScoreAutoReleases() public {
        uint256 taskId = _createAndDeliver(500e18);

        vm.prank(aiOracle);
        taskAttest.attest(taskId, 85, "ipfs://reasoning");

        assertEq(usdt.balanceOf(worker), 500e18);
        (,,,,,,, TaskAttest.Status status,) = taskAttest.tasks(taskId);
        assertEq(uint8(status), uint8(TaskAttest.Status.Released));
    }

    function testLowScoreFlagsInsteadOfReleasing() public {
        uint256 taskId = _createAndDeliver(500e18);

        vm.prank(aiOracle);
        taskAttest.attest(taskId, 40, "ipfs://reasoning");

        assertEq(usdt.balanceOf(worker), 0);
        (,,,,,,, TaskAttest.Status status,) = taskAttest.tasks(taskId);
        assertEq(uint8(status), uint8(TaskAttest.Status.Flagged));
    }

    function testPosterCanApproveFlaggedTask() public {
        uint256 taskId = _createAndDeliver(500e18);

        vm.prank(aiOracle);
        taskAttest.attest(taskId, 40, "ipfs://reasoning");

        vm.prank(poster);
        taskAttest.posterApprove(taskId);

        assertEq(usdt.balanceOf(worker), 500e18);
    }

    function testPosterCanReclaimAfterReviewWindow() public {
        uint256 taskId = _createAndDeliver(500e18);

        vm.prank(aiOracle);
        taskAttest.attest(taskId, 40, "ipfs://reasoning");

        vm.warp(block.timestamp + 2 days + 1);
        vm.prank(poster);
        taskAttest.posterReclaim(taskId);

        assertEq(usdt.balanceOf(poster), 10_000e18); // full balance restored
    }

    function testPosterCannotReclaimBeforeReviewWindow() public {
        uint256 taskId = _createAndDeliver(500e18);

        vm.prank(aiOracle);
        taskAttest.attest(taskId, 40, "ipfs://reasoning");

        vm.prank(poster);
        vm.expectRevert("review window not elapsed");
        taskAttest.posterReclaim(taskId);
    }

    function testNonOracleCannotAttest() public {
        uint256 taskId = _createAndDeliver(500e18);

        vm.prank(poster);
        vm.expectRevert();
        taskAttest.attest(taskId, 90, "ipfs://reasoning");
    }

    function testCannotAttestBeforeDelivery() public {
        vm.startPrank(poster);
        usdt.approve(address(taskAttest), 100e18);
        uint256 taskId = taskAttest.createTask("ipfs://spec", 100e18);
        vm.stopPrank();

        vm.prank(aiOracle);
        vm.expectRevert("not awaiting attestation");
        taskAttest.attest(taskId, 90, "ipfs://reasoning");
    }
}
