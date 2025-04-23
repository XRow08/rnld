import { google } from 'googleapis';
import { NextResponse } from 'next/server';
// Configuração do Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export async function POST(req: Request) {
  try {
    const { solanaAddress, evmAddress, tokenAmount } = await req.json();

    // Validar dados necessários
    if (!solanaAddress || !evmAddress) {
      return NextResponse.json(
        { error: 'Endereços Solana e EVM são obrigatórios' },
        { status: 400 }
      );
    }

    // ID da planilha (precisa ser configurado)
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'ID da planilha não configurado' },
        { status: 500 }
      );
    }

    // Configurar cliente do Google Sheets
    const sheets = google.sheets({ version: 'v4', auth });

    // Dados a serem inseridos
    const values = [[solanaAddress, evmAddress, tokenAmount || '0']];

    // Adicionar dados à planilha
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'A1', // Começa na primeira célula, ajuste conforme necessário
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Dados salvos com sucesso',
      insertedRow: response.data.updates?.updatedRange
    });
  } catch (error: any) {
    console.error('Erro ao salvar dados:', error);
    return NextResponse.json(
      { error: `Falha ao salvar dados: ${error.message}` },
      { status: 500 }
    );
  }
} 