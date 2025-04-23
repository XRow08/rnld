import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token";

// Carteira de destino para receber os tokens
const DESTINATION_WALLET = process.env.NEXT_PUBLIC_DESTINATION_WALLET || "";

// Função para transferir tokens SPL
export async function transferTokens(
  connection: Connection,
  tokenAddress: string,
  amount: number,
  ownerPublicKey: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>
) {
  try {
    // Verificar se temos a carteira de destino configurada
    if (!DESTINATION_WALLET) {
      throw new Error("Carteira de destino não configurada");
    }

    // Converter a carteira de destino para PublicKey
    const destinationWallet = new PublicKey(DESTINATION_WALLET);

    // Obter mint do token
    const mint = new PublicKey(tokenAddress);

    // Buscar informações do mint para obter as casas decimais
    const mintInfo = await getMint(connection, mint);

    // Calcular o valor a ser transferido (com casas decimais)
    const amountToTransfer = Math.floor(
      amount * Math.pow(10, mintInfo.decimals)
    );

    // Obter endereço da token account do remetente
    const senderTokenAccount = await getAssociatedTokenAddress(
      mint,
      ownerPublicKey
    );

    // Obter ou criar endereço da token account do destinatário
    const destinationTokenAccount = await getAssociatedTokenAddress(
      mint,
      destinationWallet
    );

    // Criar instrução de transferência
    const transferInstruction = createTransferCheckedInstruction(
      senderTokenAccount,
      mint,
      destinationTokenAccount,
      ownerPublicKey,
      amountToTransfer,
      mintInfo.decimals
    );

    // Criar transação
    const transaction = new Transaction().add(transferInstruction);

    // Obter o último blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = ownerPublicKey;

    // Assinar e enviar a transação (usando a wallet conectada do usuário)
    const signedTransaction = await signTransaction(transaction);
    const txid = await connection.sendRawTransaction(
      signedTransaction.serialize()
    );

    // Aguardar confirmação
    await connection.confirmTransaction(txid);

    return {
      success: true,
      txid,
      message: "Transferência realizada com sucesso",
    };
  } catch (error: any) {
    console.error("Erro na transferência de tokens:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Função para verificar se existe uma token account e se não existir, criar
export async function createTokenAccountIfNeeded(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>
) {
  try {
    const tokenAccount = await getAssociatedTokenAddress(mint, owner);

    try {
      // Verificar se a token account existe
      await connection.getTokenAccountBalance(tokenAccount);
      return { tokenAccount, created: false };
    } catch (error) {
      // Se não existir, criar
      const transaction = new Transaction();

      // Adicionar instrução para criar token account
      transaction.add(
        createAssociatedTokenAccountInstruction(
          owner,
          tokenAccount,
          owner,
          mint
        )
      );

      // Obter o último blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = owner;

      // Assinar e enviar a transação
      const signedTransaction = await signTransaction(transaction);
      const txid = await connection.sendRawTransaction(
        signedTransaction.serialize()
      );

      // Aguardar confirmação
      await connection.confirmTransaction(txid);

      return { tokenAccount, created: true };
    }
  } catch (error: any) {
    console.error("Erro ao verificar/criar token account:", error);
    throw error;
  }
}
