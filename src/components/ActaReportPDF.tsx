import React from 'react';
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image
} from '@react-pdf/renderer';

// Interface for component props
export interface ActaProps {
  nombre: string;
  identificacion: string;
  cargo: string;
  articulos: Array<{
    imagen: string;
    descripcion: string;
    talla: string;
    cantidad: number;
  }>;
  firmaBase64: string;
  firmaGiverBase64?: string;
  nombreGiver?: string;
  evidencias?: string[];
  logoUrl?: string;
  fecha?: string;
  nroActa?: string;
}

// Styles definition - Corporate Slate/Navy/Blue
const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 60,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#334155', // slate-700
    backgroundColor: '#ffffff'
  },
  // Header Section
  header: {
    flexDirection: 'row',
    backgroundColor: '#0f172a', // slate-900
    borderRadius: 8,
    marginBottom: 24,
    height: 70,
    overflow: 'hidden',
    color: '#ffffff'
  },
  headerLogo: {
    width: '25%',
    backgroundColor: '#1e293b', // slate-800
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  headerTitle: {
    width: '75%',
    justifyContent: 'center',
    paddingLeft: 20,
  },
  titleText: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#f8fafc', // slate-50
  },
  subtitleText: {
    fontSize: 9,
    marginTop: 4,
    color: '#94a3b8', // slate-400
  },
  // Info Section (Data Table)
  infoTable: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0', // slate-200
    borderRadius: 6,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    width: '35%',
    backgroundColor: '#f8fafc', // slate-50
    padding: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#475569', // slate-600
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    textTransform: 'uppercase',
  },
  infoValue: {
    width: '65%',
    padding: 8,
    fontSize: 9,
    color: '#0f172a', // slate-900
    fontFamily: 'Helvetica-Bold',
  },
  // Products Section
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a', // blue-900
    marginBottom: 8,
    textTransform: 'uppercase',
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6', // blue-500
    paddingBottom: 4,
  },
  productsTable: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  productsHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b', // slate-800
    color: '#ffffff',
  },
  productsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minHeight: 45,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  productsRowAlt: {
    backgroundColor: '#f8fafc',
  },
  colFoto: { width: '15%', borderRightWidth: 1, borderRightColor: '#e2e8f0', padding: 4, alignItems: 'center', justifyContent: 'center' },
  colArticulo: { width: '55%', borderRightWidth: 1, borderRightColor: '#e2e8f0', padding: 8 },
  colTalla: { width: '15%', borderRightWidth: 1, borderRightColor: '#e2e8f0', padding: 8, textAlign: 'center' },
  colCantidad: { width: '15%', padding: 8, textAlign: 'center' },

  headerCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    padding: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productCell: {
    fontSize: 9,
    color: '#334155',
  },
  productImage: {
    width: 35,
    height: 35,
    objectFit: 'contain',
    borderRadius: 4,
  },
  // Evidence Gallery
  evidenceSection: {
    marginTop: 24,
  },
  evidenceContainer: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1', // slate-300
    borderStyle: 'dashed',
  },
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  evidencePhoto: {
    width: 140,
    height: 105,
    objectFit: 'cover',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  // Signature Section
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  signatureBlock: {
    width: '45%',
    alignItems: 'center',
  },
  signatureBox: {
    width: '100%',
    height: 70,
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  signatureImage: {
    width: '90%',
    height: 60,
    objectFit: 'contain',
  },
  signatureLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  signatureSubLabel: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  watermark: {
    position: 'absolute',
    top: '35%',
    left: '10%',
    opacity: 0.03,
    transform: 'rotate(-45deg)',
  },
  watermarkText: {
    fontSize: 80,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  }
});

// Component
export const ActaReportPDF: React.FC<ActaProps> = ({
  nombre,
  identificacion,
  cargo,
  articulos,
  firmaBase64,
  firmaGiverBase64,
  nombreGiver,
  evidencias,
  logoUrl,
  fecha = new Date().toLocaleDateString(),
  nroActa = 'S/N'
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Background Watermark */}
      <View style={styles.watermark} fixed>
        <Text style={styles.watermarkText}>INVENTARX</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLogo}>
          {logoUrl ? (
            <Image src={logoUrl} style={{ width: 45, height: 45, objectFit: 'contain' }} />
          ) : (
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fff' }}>INVENTARX</Text>
          )}
        </View>
        <View style={styles.headerTitle}>
          <Text style={styles.titleText}>Acta Oficial de Entrega</Text>
          <Text style={styles.subtitleText}>Dotación y Elementos de Protección Personal (EPP)</Text>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoTable}>
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}><Text>Código del Acta</Text></View>
          <View style={styles.infoValue}><Text>{nroActa}</Text></View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}><Text>Fecha de Entrega</Text></View>
          <View style={styles.infoValue}><Text>{fecha}</Text></View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}><Text>Funcionario / Colaborador</Text></View>
          <View style={styles.infoValue}><Text>{nombre}</Text></View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}><Text>Documento de Identidad</Text></View>
          <View style={styles.infoValue}><Text>{identificacion}</Text></View>
        </View>
        <View style={[styles.infoRow, styles.infoRowLast]}>
          <View style={styles.infoLabel}><Text>Área / Cargo Asignado</Text></View>
          <View style={styles.infoValue}><Text>{cargo}</Text></View>
        </View>
      </View>

      {/* Products Table */}
      <Text style={styles.sectionTitle}>Relación de Elementos Entregados</Text>
      <View style={styles.productsTable}>
        <View style={styles.productsHeader}>
          <View style={[styles.colFoto, { borderRightColor: '#334155' }]}><Text style={styles.headerCell}>Img</Text></View>
          <View style={[styles.colArticulo, { borderRightColor: '#334155' }]}><Text style={[styles.headerCell, { textAlign: 'left' }]}>Descripción del Artículo</Text></View>
          <View style={[styles.colTalla, { borderRightColor: '#334155' }]}><Text style={styles.headerCell}>Talla</Text></View>
          <View style={styles.colCantidad}><Text style={styles.headerCell}>Cant.</Text></View>
        </View>

        {articulos.map((art, index) => (
          <View key={index} style={[styles.productsRow, index % 2 === 1 ? styles.productsRowAlt : {}]}>
            <View style={styles.colFoto}>
              {art.imagen ? (
                <Image src={art.imagen} style={styles.productImage} />
              ) : (
                <View style={{ width: 30, height: 30, backgroundColor: '#e2e8f0', borderRadius: 4 }} />
              )}
            </View>
            <View style={styles.colArticulo}>
              <Text style={[styles.productCell, { fontFamily: 'Helvetica-Bold' }]}>{art.descripcion}</Text>
            </View>
            <View style={styles.colTalla}>
              <Text style={[styles.productCell, { textAlign: 'center' }]}>{art.talla || 'N/A'}</Text>
            </View>
            <View style={styles.colCantidad}>
              <Text style={[styles.productCell, { textAlign: 'center', fontFamily: 'Helvetica-Bold' }]}>{art.cantidad}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Evidence Section - With wrap=false so it doesn't break internally or it pushes to next page */}
      {evidencias && evidencias.length > 0 && (
        <View style={styles.evidenceSection} wrap={false}>
          <Text style={styles.sectionTitle}>Registro Fotográfico de Seguridad</Text>
          <View style={styles.evidenceContainer}>
            <View style={styles.evidenceGrid}>
              {evidencias.map((photo, i) => (
                <Image key={i} src={photo} style={styles.evidencePhoto} />
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Signature Section - wrap=false keeps the signatures together */}
      <View style={styles.signatureSection} wrap={false}>
        {/* Giver Signature */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureBox}>
            {firmaGiverBase64 && (
              <Image src={firmaGiverBase64} style={styles.signatureImage} />
            )}
          </View>
          <Text style={styles.signatureLabel}>Sello de Seguridad Institucional</Text>
          <Text style={styles.signatureSubLabel}>Administrador: {nombreGiver || 'N/A'}</Text>
        </View>

        {/* Receiver Signature */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureBox}>
            {firmaBase64 && (
              <Image src={firmaBase64} style={styles.signatureImage} />
            )}
          </View>
          <Text style={styles.signatureLabel}>Firma de Aceptación y Recibo</Text>
          <Text style={styles.signatureSubLabel}>{nombre}</Text>
          <Text style={styles.signatureSubLabel}>C.C. {identificacion}</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer} fixed>
        Este documento certifica legalmente la entrega de los elementos descritos. El trabajador declara haberlos recibido en buen estado y asume la responsabilidad de utilizarlos adecuadamente durante el desarrollo de sus funciones, conforme a la política de seguridad y salud en el trabajo.
      </Text>
    </Page>
  </Document>
);
