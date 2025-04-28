import { ClaimButton } from "./ClaimButton";

interface ClaimStepProps {
  snapshotBalance: string | null;
  evmAddress: string;
  merkleProof: string[] | null;
  isEnabled: boolean;
  onBack: () => void;
}

export const ClaimStep = ({
  snapshotBalance,
  evmAddress,
  merkleProof,
  isEnabled,
  onBack,
}: ClaimStepProps) => {
  return (
    <ClaimButton
      snapshotBalance={snapshotBalance}
      evmAddress={evmAddress}
      merkleProof={merkleProof}
      isEnabled={isEnabled}
    />
  );
};
