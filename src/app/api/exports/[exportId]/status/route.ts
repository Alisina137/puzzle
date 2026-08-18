import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExportService } from '@/modules/export/export.service';

// GET /api/exports/[exportId]/status - Get export status
export async function GET(
  req: NextRequest,
  context: { params: { exportId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { exportId } = context.params;

    // Get export record
    const exportRecord = await prisma.export.findUnique({
      where: { id: exportId },
      include: {
        book: true,
      },
    });

    if (!exportRecord) {
      return Response.json(
        { error: 'Export not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (exportRecord.userId !== session.user.id) {
      return Response.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const result = await ExportService.getExportStatus(exportId);

    return Response.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Status error:', error);
    return Response.json(
      { error: error.message || 'Failed to get export status' },
      { status: 500 }
    );
  }
}
