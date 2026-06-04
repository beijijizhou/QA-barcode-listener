CREATE OR REPLACE FUNCTION get_today_barcode_count_by_user(
    p_user TEXT
)
RETURNS INTEGER
LANGUAGE SQL
AS $$
    SELECT COUNT(DISTINCT barcode)::INTEGER
    FROM barcode_scans
    WHERE scanned_by = p_user
      AND DATE(scanned_at AT TIME ZONE 'America/New_York')
          = DATE(NOW() AT TIME ZONE 'America/New_York');
$$;