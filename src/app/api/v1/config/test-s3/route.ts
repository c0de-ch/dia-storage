import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { withAdmin } from '@/lib/auth/middleware';
import { S3Client, type S3ClientConfig, ListBucketsCommand } from '@aws-sdk/client-s3';

export const POST = withAdmin(async (request: NextRequest) => {
  try {
    const configs = await db.select().from(schema.settings);
    const configMap: Record<string, string> = {};
    for (const row of configs) {
      configMap[row.key] = String(row.value);
    }

    const s3Endpoint = configMap.s3Endpoint;
    const s3Region = configMap.s3Region || 'us-east-1';
    const s3AccessKey = configMap.s3AccessKey;
    const s3SecretKey = configMap.s3SecretKey;

    if (!s3AccessKey || !s3SecretKey) {
      return NextResponse.json(
        { success: false, message: 'Configurazione S3 non completa. Impostare chiave di accesso e chiave segreta.' },
        { status: 400 }
      );
    }

    const clientConfig: S3ClientConfig = {
      region: s3Region,
      credentials: {
        accessKeyId: s3AccessKey,
        secretAccessKey: s3SecretKey,
      },
    };

    if (s3Endpoint) {
      clientConfig.endpoint = s3Endpoint;
      clientConfig.forcePathStyle = true;
    }

    const s3Client = new S3Client(clientConfig);
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);

    const buckets = response.Buckets?.map((b) => b.Name) || [];

    return NextResponse.json({
      success: true,
      message: 'Connessione S3 riuscita.',
      buckets,
    });
  } catch (error) {
    console.error('Errore nel test della connessione S3:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return NextResponse.json(
      {
        success: false,
        message: `Errore nella connessione S3: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
});
