import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { ActaReportPDF, ActaProps } from '../components/ActaReportPDF';
import { authFetch, readSession } from './api';

export const generateAndPersistActaPDF = async (
  data: ActaProps,
  solicitudId: string,
  employeeDocument: string,
  transactionCode: string
): Promise<{ success: boolean; url?: string; message?: string }> => {
  try {
    console.log('[PDF-GENERATOR] Iniciando compilación de Acta PDF para solicitud:', solicitudId);
    
    // 1. Instanciar el componente PDF dinámicamente y convertir a Blob binario
    const element = React.createElement(ActaReportPDF, data) as React.ReactElement<any>;
    const blob = await pdf(element).toBlob();
    
    console.log(`[PDF-GENERATOR] Blob generado exitosamente. Tamaño: ${(blob.size / 1024).toFixed(2)} KB`);

    // 2. Empaquetar en FormData con nomenclatura estricta
    const fileName = `CC_${employeeDocument}_ACTA_${transactionCode.replace(/[^a-zA-Z0-9]/g, '')}.pdf`;
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('employeeDocument', employeeDocument);
    formData.append('transactionCode', transactionCode);
    formData.append('solicitudId', solicitudId);

    const session = readSession();
    if (!session) {
      throw new Error('No hay sesión activa para subir el documento.');
    }

    console.log('[PDF-GENERATOR] Subiendo PDF a Cloudinary vía Backend...');

    // 3. Subir vía POST al endpoint de backend
    // Nota: El authFetch ya fue configurado para no forzar application/json si es FormData
    const response = await authFetch<any>(`/api/v1/dotacion/solicitudes/${solicitudId}/upload-acta`, session, () => {
      console.warn('Sesión expirada durante la subida del acta.');
    }, {
      method: 'POST',
      body: formData
    });

    console.log('[PDF-GENERATOR] Subida exitosa:', response);
    return {
      success: true,
      url: response?.url || response?.secure_url,
      message: 'Acta generada y guardada exitosamente.'
    };

  } catch (error: any) {
    console.error('[PDF-GENERATOR] Error generando/subiendo acta:', error);
    return {
      success: false,
      message: error.message || 'Error desconocido al generar y subir el PDF.'
    };
  }
};

export const generateLocalActaBlob = async (data: ActaProps) => {
  const element = React.createElement(ActaReportPDF, data) as React.ReactElement<any>;
  return await pdf(element).toBlob();
};

export const downloadLocalActaPDF = async (data: ActaProps, filename: string) => {
  try {
    const blob = await generateLocalActaBlob(data);
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('[PDF-GENERATOR] Error generando PDF local:', error);
    return false;
  }
};
