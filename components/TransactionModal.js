import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
} from "@heroui/react";
import { Link } from "@heroui/link";

export default function TransactionModal({ txData, onClose }) {
    if (!txData) return null;

    return (
        <Modal 
            isOpen={!!txData} 
            onOpenChange={() => onClose()}
            placement="center"
            backdrop="blur"
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            Verified on Chain! 🎉
                        </ModalHeader>
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
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <path d="M22 4L12 14.01l-3-3" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Transaction Successful
                                </h3>
                                <div className="space-y-3 w-full">
                                    <div className="text-left">
                                        <p className="text-gray-600 mb-1 text-sm">Task Creation:</p>
                                        <Link 
                                            href={`https://holesky.etherscan.io/tx/${txData.createTaskHash}`}
                                            isExternal
                                            showAnchorIcon
                                            color="primary"
                                            className="text-[#823EE4] hover:opacity-70"
                                        >
                                            View on Explorer
                                        </Link>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-gray-600 mb-1 text-sm">Operator Response:</p>
                                        <Link 
                                            href={`https://holesky.etherscan.io/tx/${txData.responseHash}`}
                                            isExternal
                                            showAnchorIcon
                                            color="primary"
                                            className="text-[#823EE4] hover:opacity-70"
                                        >
                                            View on Explorer
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button 
                                color="primary"
                                onPress={onClose}
                                className="bg-gradient-to-r from-[#823EE4] to-[#37DDDF] text-white w-full"
                            >
                                Close
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
} 