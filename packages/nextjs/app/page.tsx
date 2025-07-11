"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { mainnet } from "viem/chains";
import { useAccount, useEnsName } from "wagmi";
import { usePublicClient } from "wagmi";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWatchContractEvent } from "~~/hooks/scaffold-eth";

interface EventWithTimestamp {
  event: any;
  timestamp: string;
}

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
  const [burnEventsWithTime, setBurnEventsWithTime] = useState<EventWithTimestamp[]>([]);
  const [pendingBread, setPendingBread] = useState<number | null>(null);

  const { data: breadBalance } = useScaffoldReadContract({
    contractName: "BuidlGuidlBread",
    functionName: "balanceOf",
    args: [connectedAddress],
  });

  const { data: mintEvents } = useScaffoldEventHistory({
    contractName: "BuidlGuidlBread",
    eventName: "Mint",
    fromBlock: 0n,
    filters: { user: connectedAddress },
  });

  const { data: burnEvents } = useScaffoldEventHistory({
    contractName: "BuidlGuidlBread",
    eventName: "PenaltyBurn",
    fromBlock: 0n,
    filters: { target: connectedAddress },
  });

  // Listen for new Mint events
  useScaffoldWatchContractEvent({
    contractName: "BuidlGuidlBread",
    eventName: "Mint",
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
            console.error("Error processing new mint event:", error);
          }
        }
      });
    },
  });

  // Listen for new PenaltyBurn events
  useScaffoldWatchContractEvent({
    contractName: "BuidlGuidlBread",
    eventName: "PenaltyBurn",
    onLogs: logs => {
      logs.forEach(async log => {
        // Only add events for the connected user
        if (log.args.target === connectedAddress) {
          try {
            const block = await publicClient?.getBlock({ blockNumber: log.blockNumber });
            const timestamp = block ? formatTimestamp(Number(block.timestamp)) : "Unknown time";
            const newEventWithTime = {
              event: log,
              timestamp,
            };

            setBurnEventsWithTime(prev => {
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
            console.error("Error processing new burn event:", error);
          }
        }
      });
    },
  });

  // Clear events when wallet disconnects and handle events when connected
  useEffect(() => {
    if (!connectedAddress) {
      setMintEventsWithTime([]);
      setBurnEventsWithTime([]);
      return;
    }

    // Only process events if we have a connected address and events exist
    if (!mintEvents && !burnEvents) {
      return;
    }

    const fetchBlockTimestamps = async () => {
      if (!publicClient) return;

      // Sort events by block number (most recent first)
      const sortedMintEvents = [...(mintEvents || [])].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
      const sortedBurnEvents = [...(burnEvents || [])].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

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

      // Fetch timestamps for burn events
      const burnPromises = sortedBurnEvents.map(async event => {
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

      const [mintResults, burnResults] = await Promise.all([Promise.all(mintPromises), Promise.all(burnPromises)]);

      setMintEventsWithTime(mintResults);
      setBurnEventsWithTime(burnResults);
    };

    fetchBlockTimestamps();
  }, [connectedAddress, mintEvents, burnEvents, publicClient]);

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
  }, [connectedAddress, ensName, ensLoading, ensError]); // Restart when address changes or ENS resolves

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const time = date.toLocaleString("en-US", { hour: "numeric", minute: "numeric", hour12: true });
    const dateStr = date.toLocaleDateString("en-US");
    return `${time} ${dateStr}`;
  };

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5 w-full max-w-3xl">
          <div className="flex justify-center items-center space-x-2 flex-col mb-8">
            <div className="my-2 text-4xl mb-0 font-bold flex flex-col sm:flex-row sm:items-center sm:justify-center sm:space-x-2">
              <span>🍞 Bread Balance:</span>
              <span className="text-center sm:text-left">
                {breadBalance ? Number(formatEther(breadBalance)).toLocaleString() : "0"} BGBRD
              </span>
            </div>
            {pendingBread !== null && <p className="text-2xl font-semibold">👨‍🍳 Pending: {pendingBread} BGBRD</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Burn Events */}
            <div className="bg-base-300 rounded-3xl px-6 py-4">
              <h2 className="text-xl font-bold mb-4 text-red-500">Burn Events</h2>
              <div className="h-[300px] md:h-[600px] overflow-y-auto">
                {burnEventsWithTime.length === 0 ? (
                  <p className="text-center text-lg">No burn events found</p>
                ) : (
                  <div className="space-y-3">
                    {burnEventsWithTime.map(({ event, timestamp }, index) => (
                      <div key={index} className="bg-base-100 rounded-xl p-3">
                        <div className="flex justify-between items-center">
                          <div className="flex gap-2 items-center">
                            <span className="text-lg font-bold text-red-500">Burned</span>
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
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
