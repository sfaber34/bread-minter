"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { usePublicClient } from "wagmi";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

interface EventWithTimestamp {
  event: any;
  timestamp: string;
}

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const [mintEventsWithTime, setMintEventsWithTime] = useState<EventWithTimestamp[]>([]);
  const [burnEventsWithTime, setBurnEventsWithTime] = useState<EventWithTimestamp[]>([]);

  const { data: breadBalance } = useScaffoldReadContract({
    contractName: "Bread",
    functionName: "balanceOf",
    args: [connectedAddress],
  });

  const { data: mintEvents } = useScaffoldEventHistory({
    contractName: "Bread",
    eventName: "Mint",
    fromBlock: 0n,
    filters: { user: connectedAddress },
  });

  const { data: burnEvents } = useScaffoldEventHistory({
    contractName: "Bread",
    eventName: "PenaltyBurn",
    fromBlock: 0n,
    filters: { target: connectedAddress },
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
            <p className="my-2 text-4xl mb-2 font-bold">Your Bread Balance</p>
            <p className="text-4xl font-bold">🍞 {breadBalance ? formatEther(breadBalance) : "0"} BRD</p>
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
                              {event.args.amount ? formatEther(event.args.amount) : "0"} BRD
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
                              {event.args.amount ? formatEther(event.args.amount) : "0"} BRD
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
