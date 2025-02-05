"use client";
import { useState, useRef, useEffect } from "react";
import {
  useWeb3ModalProvider,
  useWeb3ModalAccount,
} from "@web3modal/ethers/react";
import ContractService from "../services/contractService";
import { BrowserProvider } from "ethers";
import ChatHistorySidebar from "./ChatHistorySidebar";
import nillionService from "../services/nillionService";
import toast from "react-hot-toast";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const [chats, setChats] = useState([]);
  const messagesEndRef = useRef(null);
  const { walletProvider } = useWeb3ModalProvider();
  const { address, isConnected } = useWeb3ModalAccount();
  const [contractService, setContractService] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isNillionLoading, setIsNillionLoading] = useState(false);

  // Check for wallet on mount
  useEffect(() => {
    const checkWallet = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        setHasWallet(accounts && accounts.length > 0);
      }
    };
    checkWallet();
  }, []);

  useEffect(() => {
    if (walletProvider) {
      const service = new ContractService(walletProvider);
      setContractService(service);

      // Listen for new tasks and responses
      const unsubscribeTask = service.listenToNewTasks((taskIndex, task) => {
        console.log("New task created:", taskIndex, task);
      });

      const unsubscribeResponse = service.listenToResponses(
        (taskIndex, response) => {
          setMessages((prev) => {
            // Find the loading message and replace it
            const newMessages = prev.filter((msg) => !msg.isLoading);
            return [
              ...newMessages,
              {
                role: "assistant",
                content: response,
                taskIndex,
              },
            ];
          });
        }
      );

      return () => {
        unsubscribeTask();
        unsubscribeResponse();
      };
    }
  }, [walletProvider]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !isConnected || !contractService) return;

    setIsLoading(true);
    try {
      // Create task on blockchain
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const { hash, task, taskIndex } = await contractService.createTask(input);

      // Update messages with user input and transaction hash
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: `${input}\n\nTransaction submitted! Hash: ${hash}`,
        },
      ]);

      // Get AI response
      const aiResponse = await contractService.getAIResponse(input);

      // Submit AI response to blockchain
      const responseHash = await contractService.respondToTask(
        task,
        taskIndex,
        aiResponse
      );

      // Update messages with AI response and its transaction hash
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `${aiResponse}\n\nTransaction submitted! Hash: ${responseHash}`,
        },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `Error: ${error.message}`,
          isError: true,
        },
      ]);
    } finally {
      setInput("");
      setIsLoading(false);
    }
  };

  const handleChatSelect = (chat) => {
    setMessages(chat.chatHistory);
    setSelectedChat(chat);
  };

  const saveChatHistory = async () => {
    if (!isConnected || messages.length === 0 || isSaving || isNillionLoading)
      return;

    try {
      setIsSaving(true);
      setIsNillionLoading(true);

      // Only save to Nillion
      await nillionService.storeChatHistory(
        address,
        messages,
        `Chat ${new Date().toLocaleString()}`
      );
    } catch (error) {
      console.error("Failed to save chat history:", error);
      toast.error("Failed to save chat history");
    } finally {
      setIsSaving(false);
      setIsNillionLoading(false);
    }
  };

  // Save chat history when conversation changes
  useEffect(() => {
    if (messages.length > 0 && !isLoading && !selectedChat) {
      const timeoutId = setTimeout(saveChatHistory, 2000); // Save after 2 seconds of inactivity
      return () => clearTimeout(timeoutId);
    }
  }, [messages, isLoading, selectedChat]);

  // Load chat history
  useEffect(() => {
    if (address) {
      loadChatsFromNillion();
    }
  }, [address]);

  const loadChatsFromNillion = async () => {
    if (!address || isNillionLoading) return;

    try {
      setIsNillionLoading(true);
      console.log("Loading chats for address:", address);
      const nillionChats = await nillionService.getChatHistory(address);
      console.log("Loaded chats:", nillionChats);

      setChats((prevChats) => {
        const existingChatsMap = new Map(
          prevChats.map((chat) => [chat.id, chat])
        );

        nillionChats.forEach((chat) => {
          const formattedChat = {
            ...chat,
            chatHistory: Array.isArray(chat.chatHistory)
              ? chat.chatHistory
              : typeof chat.chatHistory === "object"
              ? [chat.chatHistory]
              : [],
          };
          existingChatsMap.set(chat.id, formattedChat);
        });

        return Array.from(existingChatsMap.values()).sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
      });
    } catch (error) {
      console.error("Failed to load chats from Nillion:", error);
      toast.error("Failed to load chat history");
    } finally {
      setIsNillionLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-73px)]">
      <ChatHistorySidebar
        onChatSelect={handleChatSelect}
        className="hidden md:block"
        isLoading={isNillionLoading}
        chats={chats}
      />
      <div className="flex flex-col flex-1">
        {/* Chat messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg whitespace-pre-wrap ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : message.role === "system"
                    ? message.isError
                      ? "bg-red-500 text-white"
                      : "bg-gray-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 dark:text-white"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t dark:border-gray-700 p-4">
          <form
            onSubmit={handleSubmit}
            className="flex gap-2 max-w-3xl mx-auto"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading || isSaving || isNillionLoading}
              className="flex-1 p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || isSaving || isNillionLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading
                ? "Sending..."
                : isSaving || isNillionLoading
                ? "Saving..."
                : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Chat;
