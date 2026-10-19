import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import qrcode from 'qrcode-generator';

/**
 * High-performance, universal QR Code generator for React Native & Web.
 * Uses pure JavaScript matrix calculation to render crisp vector-like modules
 * with zero native dependencies or SVG linking issues.
 *
 * @param {string} value The payload string or URL to encode in the QR code
 * @param {number} size Pixel width and height of the rendered QR code (default 180)
 * @param {string} color Dark module color (default '#000000')
 * @param {string} backgroundColor Light module/quiet-zone background color (default '#FFFFFF')
 * @param {string} errorCorrectionLevel 'L' | 'M' | 'Q' | 'H' (default 'M')
 */
export default function QRCode({
  value = '',
  size = 180,
  color = '#000000',
  backgroundColor = '#FFFFFF',
  errorCorrectionLevel = 'M'
}) {
  const { modules, moduleCount } = useMemo(() => {
    try {
      // Type number 0 auto-detects the minimum QR version needed
      const qr = qrcode(0, errorCorrectionLevel);
      qr.addData(String(value || 'MATINEE-EMPTY-PAYLOAD'));
      qr.make();
      const count = qr.getModuleCount();
      const matrix = [];
      for (let r = 0; r < count; r++) {
        const row = [];
        for (let c = 0; c < count; c++) {
          row.push(qr.isDark(r, c));
        }
        matrix.push(row);
      }
      return { modules: matrix, moduleCount: count };
    } catch (err) {
      console.warn('[QRCode generation error]:', err.message);
      return { modules: [], moduleCount: 0 };
    }
  }, [value, errorCorrectionLevel]);

  if (!modules.length) {
    return <View style={[styles.fallback, { width: size, height: size, backgroundColor }]} />;
  }

  // Calculate pixel size per module with integer precision
  const moduleSize = size / moduleCount;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor
        }
      ]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`QR Code containing ticket verification payload`}
    >
      {modules.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={[styles.row, { height: moduleSize }]}>
          {row.map((isDark, colIndex) => (
            <View
              key={`col-${colIndex}`}
              style={{
                width: moduleSize,
                height: moduleSize,
                backgroundColor: isDark ? color : backgroundColor
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  row: {
    flexDirection: 'row'
  },
  fallback: {
    borderRadius: 8
  }
});
