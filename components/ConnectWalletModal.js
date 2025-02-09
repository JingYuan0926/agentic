import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from "@heroui/react";
import { useWeb3Modal } from '@web3modal/ethers/react';

export default function ConnectWalletModal({ isOpen, onOpenChange }) {
  const { open } = useWeb3Modal();

  const handleConnect = () => {
    open();
    onOpenChange(false); // Close the modal after opening wallet connect
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange}
      placement="center"
      backdrop="blur"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">Connect Your Wallet</ModalHeader>
            <ModalBody>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="bg-purple-100 rounded-full p-4">
                  <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    className="text-purple-600"
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <path d="M22 19H2C1.45 19 1 18.55 1 18V6C1 5.45 1.45 5 2 5H22C22.55 5 23 5.45 23 6V18C23 18.55 22.55 19 22 19Z" />
                    <path d="M1 10H23" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Wallet Connection Required
                </h3>
                <p className="text-gray-600">
                  Please connect your wallet to start using our AI assistant. This allows us to provide you with a personalized and secure experience.
                </p>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button 
                color="primary" 
                onPress={handleConnect}
                className="bg-gradient-to-r from-[#823EE4] to-[#37DDDF] text-white"
              >
                Connect Wallet
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
} 