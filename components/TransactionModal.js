import { Link } from "@heroui/link";

export default function TransactionModal({ txData, onClose }) {
    if (!txData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                <h3 className="text-lg font-bold mb-4">Verified on Chain! 🎉</h3>
                <div className="space-y-3">
                    <div>
                        <p className="text-gray-600 mb-1">Task Creation:</p>
                        <Link 
                            href={`https://holesky.etherscan.io/tx/${txData.createTaskHash}`}
                            isExternal
                            showAnchorIcon
                            color="primary"
                            className="hover:opacity-70"
                        >
                            View on Explorer
                        </Link>
                    </div>
                    <div>
                        <p className="text-gray-600 mb-1">Operator Response:</p>
                        <Link 
                            href={`https://holesky.etherscan.io/tx/${txData.responseHash}`}
                            isExternal
                            showAnchorIcon
                            color="primary"
                            className="hover:opacity-70"
                        >
                            View on Explorer
                        </Link>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="mt-6 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
} 