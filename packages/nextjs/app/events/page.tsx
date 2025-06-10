"use client";

import { formatEther } from "viem";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

const EventsPage = () => {
  const { data: mintEvents, isLoading } = useScaffoldEventHistory({
    contractName: "Bread",
    eventName: "Mint",
    fromBlock: 0n,
    watch: true,
  });

  return (
    <div className="flex flex-col items-center py-10 px-5 sm:px-0 lg:py-20 max-w-[1000px] mx-auto">
      <h1 className="text-4xl font-bold mb-8">Mint Events</h1>

      {isLoading ? (
        <div className="flex justify-center items-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : mintEvents && mintEvents.length > 0 ? (
        <div className="w-full overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>User</th>
                <th>Amount</th>
                <th>Block Number</th>
                <th>Transaction Hash</th>
              </tr>
            </thead>
            <tbody>
              {mintEvents.map((event, index) => (
                <tr key={index}>
                  <td className="font-mono">{event.args.user}</td>
                  <td>{event.args.amount ? formatEther(event.args.amount) : "0"} BRD</td>
                  <td>{event.blockNumber?.toString() ?? "Unknown"}</td>
                  <td className="font-mono">
                    <a
                      href={`/blockexplorer/tx/${event.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary"
                    >
                      {event.transactionHash.slice(0, 8)}...{event.transactionHash.slice(-6)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-xl">No mint events found</p>
        </div>
      )}
    </div>
  );
};

export default EventsPage;
