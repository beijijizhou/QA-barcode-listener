import { createClient }
from '@supabase/supabase-js';

import {
  SUPABASE_URL,
  SUPABASE_KEY
} from './config.js';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

export async function saveBarcode(
  barcode,
  scannedBy
) {

  const { data, error } =
    await supabase
      .from('barcode_scans')
      .insert([
        {
          barcode,
          scanned_by: scannedBy
        }
      ]);

  if (error) {
    console.error(
      'DB Save Error:',
      error
    );
    throw error;
  }

  return data;
}

export async function getBarcodeCount() {

  const { count, error } =
    await supabase
      .from('barcode_scans')
      .select('*', {
        count: 'exact',
        head: true
      });

  if (error) {
    throw error;
  }

  return count;
}

export async function findBarcode(
  barcode
) {

  const { data, error } =
    await supabase
      .from('barcode_scans')
      .select('*')
      .eq('barcode', barcode);

  if (error) {
    throw error;
  }

  return data;
}