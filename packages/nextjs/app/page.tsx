"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount, useEnsName, usePublicClient } from "wagmi";
import { mainnet } from "wagmi/chains";
import { AddressInput, InputBase } from "~~/components/scaffold-eth";
import {
  useScaffoldEventHistory,
  useScaffoldReadContract,
  useScaffoldWatchContractEvent,
  useScaffoldWriteContract,
} from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type EventWithTimestamp = {
  event: any; // The event object
  timestamp: string; // Human-readable timestamp
};

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleString();
};

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const {
    data: ensName,
    isLoading: ensLoading,
    error: ensError,
  } = useEnsName({
    address: connectedAddress,
    chainId: mainnet.id,
  });
  const publicClient = usePublicClient();
  const [mintEventsWithTime, setMintEventsWithTime] = useState<EventWithTimestamp[]>([]);
  const [pendingBread, setPendingBread] = useState<number | null>(null);

  // Transfer state
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);

  const { data: breadBalance } = useScaffoldReadContract({
    contractName: "BuidlGuidlBread",
    functionName: "balanceOf",
    args: [connectedAddress],
  });

  const { writeContractAsync: writeBreadContract } = useScaffoldWriteContract({
    contractName: "BuidlGuidlBread",
  });

  const { data: mintEvents } = useScaffoldEventHistory({
    contractName: "BuidlGuidlBread",
    eventName: "BatchMint",
    fromBlock: 0n,
    filters: { user: connectedAddress },
  });

  // Listen for new BatchMint events
  useScaffoldWatchContractEvent({
    contractName: "BuidlGuidlBread",
    eventName: "BatchMint",
    onLogs: logs => {
      logs.forEach(async log => {
        // Only add events for the connected user
        if (log.args.user === connectedAddress) {
          try {
            const block = await publicClient?.getBlock({ blockNumber: log.blockNumber });
            const newEventWithTime = {
              event: log,
              timestamp: block ? formatTimestamp(Number(block.timestamp)) : "Unknown time",
            };

            setMintEventsWithTime(prev => {
              // Check if event already exists to avoid duplicates
              const exists = prev.some(
                item =>
                  item.event.blockNumber === log.blockNumber && item.event.transactionHash === log.transactionHash,
              );
              if (!exists) {
                // Add new event at the beginning (most recent first)
                return [newEventWithTime, ...prev];
              }
              return prev;
            });
          } catch (error) {
            console.error("Error processing new batch mint event:", error);
          }
        }
      });
    },
  });

  // Clear events when wallet disconnects and handle events when connected
  useEffect(() => {
    if (!connectedAddress) {
      setMintEventsWithTime([]);
      return;
    }

    // Only process events if we have a connected address and events exist
    if (!mintEvents) {
      return;
    }

    const fetchBlockTimestamps = async () => {
      if (!publicClient) return;

      // Sort events by block number (most recent first)
      const sortedMintEvents = [...(mintEvents || [])].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

      // Fetch timestamps for mint events
      const mintPromises = sortedMintEvents.map(async event => {
        try {
          const block = await publicClient.getBlock({ blockNumber: event.blockNumber });
          return {
            event,
            timestamp: formatTimestamp(Number(block.timestamp)),
          };
        } catch (error) {
          console.error("Error fetching block:", error);
          return {
            event,
            timestamp: "Unknown time",
          };
        }
      });

      const mintResults = await Promise.all(mintPromises);

      setMintEventsWithTime(mintResults);
    };

    fetchBlockTimestamps();
  }, [connectedAddress, mintEvents, publicClient]);

  // Set up interval to fetch pending bread every 5 seconds
  // Note: ENS resolution happens automatically via useEnsName hook and only when address changes
  useEffect(() => {
    if (!connectedAddress) {
      setPendingBread(null);
      return;
    }

    // Fetch pending bread amount from API
    const fetchPendingBread = async (address: string, ensName?: string | null) => {
      try {
        // Use ENS name if available, otherwise use address
        const queryParam = ensName || address;
        console.log("Fetching pending bread for:", queryParam, "(ENS:", ensName, "Address:", address, ")");
        console.log("ENS Loading:", ensLoading, "ENS Error:", ensError);
        const response = await axios.get(
          `https://pool.mainnet.rpc.buidlguidl.com:48546/yourpendingbread?owner=${queryParam}`,
        );
        console.log("API Response:", response.data);
        console.log("API Response bread value:", response.data.bread, "Type:", typeof response.data.bread);
        // Ensure we return a number or null
        return typeof response.data.bread === "number" ? response.data.bread : null;
      } catch (error) {
        console.error(`Error fetching pending bread: ${error}`);
        console.error("Full error:", error);
        return null;
      }
    };

    // Function to fetch with current ENS name or address
    const fetchWithCurrentParams = () => {
      fetchPendingBread(connectedAddress, ensName).then(setPendingBread);
    };

    // Fetch immediately
    fetchWithCurrentParams();

    // Set up interval for every 5 seconds (only fetches pending bread, ENS is cached)
    const interval = setInterval(fetchWithCurrentParams, 5000);

    // Cleanup interval on unmount or address change
    return () => clearInterval(interval);
  }, [connectedAddress, ensName, ensLoading, ensError]);

  const handleTransfer = async () => {
    if (!transferTo || !transferAmount || !connectedAddress) {
      notification.error("Please fill in all fields");
      return;
    }

    try {
      setIsTransferring(true);

      const amountInWei = parseEther(transferAmount);

      // Check if user has enough balance
      if (breadBalance && amountInWei > breadBalance) {
        notification.error("Insufficient balance");
        return;
      }

      await writeBreadContract({
        functionName: "transfer",
        args: [transferTo, amountInWei],
      });

      notification.success("Transfer successful!");

      // Clear form
      setTransferTo("");
      setTransferAmount("");
    } catch (error: any) {
      console.error("Transfer error:", error);
      notification.error("Transfer failed: " + (error?.message || "Unknown error"));
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5 w-full max-w-[1200px]">
          <div className="flex justify-center items-center space-x-2 flex-col mb-8">
            <div className="my-2 text-4xl mb-0 font-bold flex flex-col sm:flex-row sm:items-center sm:justify-center sm:space-x-2">
              <span>🍞 Bread Balance:</span>
              <span className="text-center sm:text-left">
                {breadBalance ? Number(formatEther(breadBalance)).toLocaleString() : "0"} BGBRD
              </span>
            </div>
            {pendingBread !== null && <p className="text-2xl font-semibold">👨‍🍳 Pending: {pendingBread} BGBRD</p>}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Mint Events */}
            <div className="bg-base-300 rounded-3xl px-6 py-4">
              <h2 className="text-xl font-bold mb-4 text-green-500">Mint Events</h2>
              <div className="h-[300px] md:h-[600px] overflow-y-auto">
                {mintEventsWithTime.length === 0 ? (
                  <p className="text-center text-lg">No mint events found</p>
                ) : (
                  <div className="space-y-3">
                    {mintEventsWithTime.map(({ event, timestamp }, index) => (
                      <div key={index} className="bg-base-100 rounded-xl p-3">
                        <div className="flex justify-between items-center">
                          <div className="flex gap-2 items-center">
                            <span className="text-lg font-bold text-green-500">Minted</span>
                            <span className="text-lg">
                              {event.args.amount ? formatEther(event.args.amount) : "0"} BGBRD
                            </span>
                          </div>
                          <span className="text-sm opacity-70">{timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Transfer Interface */}
            <div className="bg-base-300 rounded-3xl px-6 py-4">
              <h2 className="text-xl font-bold mb-4 text-blue-500">Transfer Bread</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Address</label>
                  <AddressInput value={transferTo} onChange={setTransferTo} placeholder="Enter recipient address" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Amount</label>
                  <InputBase
                    name="transferAmount"
                    value={transferAmount}
                    onChange={setTransferAmount}
                    placeholder="0.0"
                    prefix={<span className="pl-4 -mr-2 text-accent self-center">🍞</span>}
                  />
                </div>

                <button
                  className={`w-full btn text-lg font-semibold ${
                    isTransferring
                      ? "btn-disabled"
                      : transferTo && transferAmount
                        ? "bg-blue-400 hover:bg-blue-500 text-white border-blue-400 hover:border-blue-500"
                        : "btn-primary"
                  }`}
                  onClick={handleTransfer}
                  disabled={!connectedAddress || isTransferring || !transferTo || !transferAmount}
                >
                  {isTransferring ? (
                    <span className="flex items-center gap-2">
                      <span className="loading loading-spinner loading-sm"></span>
                      Transferring...
                    </span>
                  ) : (
                    "Transfer Bread"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
