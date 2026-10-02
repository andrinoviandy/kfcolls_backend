const query = {}

const LINK_DOK = process.env.URL_DOK
// const LINK_DOK = 'http://173.212.225.28:3000/'

// query.getListMenu = `SELECT
// CASE
//     WHEN data IS NULL OR data = '{"menu":null}' then 'Failed'
//     ELSE 'Success'
// END message,
// data
// FROM
// (SELECT
//     JSON_OBJECT('menu' VALUE JSON_ARRAYAGG(MENU)) data
// FROM
//     (SELECT
//             JSON_OBJECT('id' VALUE a.ID_MENU,
//                         'id_acl' VALUE MR.kd_ref,
//                         'name' VALUE a.MENU_TEXT,
//                         'path' VALUE a.MENU_URL,
//                         'parent' VALUE a.ID_PARENT_MENU,
//                         'submenu' VALUE (
//                                        SELECT JSON_ARRAYAGG(JSON_OBJECT('id' VALUE b.ID_MENU,
//                                                                         'id_acl' VALUE MR2.kd_ref,
//                                                                         'name' VALUE b.MENU_TEXT,
//                                                                         'path' VALUE a.MENU_URL||b.MENU_URL,
//                                                                         'parent' VALUE b.ID_PARENT_MENU,
//                                                                         'submenu' VALUE (
//                                                                                            SELECT JSON_ARRAYAGG(JSON_OBJECT('id' VALUE c.ID_MENU,
//                                                                                                                             'id_acl' VALUE MR3.kd_ref,
//                                                                                                                             'name' VALUE c.MENU_TEXT,
//                                                                                                                             'path' VALUE a.MENU_URL||b.MENU_URL||c.MENU_URL,
//                                                                                                                             'parent' VALUE c.ID_PARENT_MENU))
//                                                                                            FROM M_MENU c
//                                                                                            JOIN M_REFERENSI MR3 on c.ID_MENU = MR3.UR_REF AND MR3.JNS_REF = 'acl_has_menu'
//                                                                                            WHERE c.ID_PARENT_MENU = b.ID_MENU AND c.ORDER_POSITION = '2' AND MR3.SUB_KD_REF = :kd_ref AND MR3.FLAG_AKTIF = 'Y'
//                                                                                        )))
//                                        FROM M_MENU b
//                                        JOIN M_REFERENSI MR2 on b.ID_MENU = MR2.UR_REF AND MR2.JNS_REF = 'acl_has_menu'
//                                        WHERE b.ID_PARENT_MENU = a.ID_MENU AND b.ORDER_POSITION = '1' AND MR2.SUB_KD_REF = :kd_ref AND MR2.FLAG_AKTIF = 'Y'
//                                       )) as MENU
//     FROM M_MENU a
//     JOIN M_REFERENSI MR on a.ID_MENU = MR.UR_REF AND MR.JNS_REF = 'acl_has_menu'
//     WHERE
//         a.ORDER_POSITION = '0'
//     AND MR.SUB_KD_REF = :kd_ref
//     AND MR.FLAG_AKTIF = 'Y') PARENT) MENUS`
query.getListMenu = `
WITH ACTIONS AS (
    SELECT 
        mad.ID_MENU_ACL,
        LISTAGG(ac.ACTION_CODE, ',') WITHIN GROUP (ORDER BY ac.ACTION_CODE) AS ACTIONS
    FROM M_MENU_ACL_DETAIL mad
    JOIN M_ACTION ac ON mad.ID_ACTION = ac.ID_ACTION
    WHERE mad.FLAG_AKTIF = 'T'
    GROUP BY mad.ID_MENU_ACL
),MENU_LVL3 AS (
    SELECT 
        c.ID_PARENT_MENU,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'id' VALUE c.ID_MENU,
                'id_acl' VALUE MR3.NO_URUT,
                'name' VALUE c.MENU_TEXT,
                'path' VALUE c.MENU_URL,
                'parent' VALUE c.ID_PARENT_MENU,
                'actions' VALUE NVL(A3.ACTIONS, '')
                RETURNING CLOB
            ) RETURNING CLOB
        ) AS SUBMENU
    FROM M_MENU c
    JOIN M_MENU_ACL MR3 ON c.ID_MENU = MR3.ID_MENU
    JOIN M_ROLE R3 ON R3."Id" = MR3.ID_ROLE
    LEFT JOIN ACTIONS A3 ON A3.ID_MENU_ACL = MR3.ID_MENU_ACL
    WHERE c.ORDER_POSITION = '2'
      AND R3."RoleId" = :kd_ref
      AND MR3.FLAG_AKTIF = 'T'
    GROUP BY c.ID_PARENT_MENU
),MENU_LVL2 AS (
    SELECT 
        b.ID_PARENT_MENU,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'id' VALUE b.ID_MENU,
                'id_acl' VALUE MR2.NO_URUT,
                'name' VALUE b.MENU_TEXT,
                'path' VALUE b.MENU_URL,
                'parent' VALUE b.ID_PARENT_MENU,
                'actions' VALUE NVL(A2.ACTIONS, ''),
                'submenu' VALUE NVL(L3.SUBMENU, '[]')
                RETURNING CLOB
            ) RETURNING CLOB
        ) AS SUBMENU
    FROM M_MENU b
    JOIN M_MENU_ACL MR2 ON b.ID_MENU = MR2.ID_MENU
    JOIN M_ROLE R2 ON R2."Id" = MR2.ID_ROLE
    LEFT JOIN ACTIONS A2 ON A2.ID_MENU_ACL = MR2.ID_MENU_ACL
    LEFT JOIN MENU_LVL3 L3 ON L3.ID_PARENT_MENU = b.ID_MENU
    WHERE b.ORDER_POSITION = '1'
      AND R2."RoleId" = :kd_ref
      AND MR2.FLAG_AKTIF = 'T'
    GROUP BY b.ID_PARENT_MENU
),MENU_LVL1 AS (
    SELECT 
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'id' VALUE a.ID_MENU,
                'id_acl' VALUE MR.NO_URUT,
                'name' VALUE a.MENU_TEXT,
                'path' VALUE a.MENU_URL,
                'parent' VALUE a.ID_PARENT_MENU,
                'actions' VALUE NVL(A1.ACTIONS, ''),
                'submenu' VALUE NVL(L2.SUBMENU, '[]')
                RETURNING CLOB
            ) RETURNING CLOB
        ) AS MENU
    FROM M_MENU a
    JOIN M_MENU_ACL MR ON a.ID_MENU = MR.ID_MENU
    JOIN M_ROLE R1 ON R1."Id" = MR.ID_ROLE
    LEFT JOIN ACTIONS A1 ON A1.ID_MENU_ACL = MR.ID_MENU_ACL
    LEFT JOIN MENU_LVL2 L2 ON L2.ID_PARENT_MENU = a.ID_MENU
    WHERE a.ORDER_POSITION = '0'
      AND R1."RoleId" = :kd_ref
      AND MR.FLAG_AKTIF = 'T'
)SELECT 
    CASE
        WHEN MENU IS NULL THEN 'Failed'
        ELSE 'Success'
    END AS MESSAGE,
    JSON_OBJECT(
        'menu' VALUE MENU
        RETURNING CLOB
    ) AS DATA
FROM MENU_LVL1;
`;

query.getReferensiByJenis = `select
    a.kd_ref,
    a.ur_ref,
    a.ur_jns_ref 
from m_referensi a 
where
    a.jns_ref = :jns_ref
and
    a.flag_aktif = 'Y' :condition
and
    (UPPER(a.kd_ref) like upper(:keyword) OR UPPER(a.ur_ref) LIKE upper(:keyword))
ORDER BY a.ur_ref ASC`

query.getReferensiByJenisGroup = `
SELECT
    jns_ref,
    ur_jns_ref,
    MAX(kd_ref) AS kd_ref_end
FROM m_referensi 
WHERE flag_show = 'Y' AND 
    (UPPER(ur_jns_ref) like upper(:keyword))
GROUP BY
    jns_ref,
    ur_jns_ref
ORDER BY
    jns_ref;
`

query.getPermissionCrud = `
SELECT
    menu.KD_REF as "menu",
    permissions.KD_REF as "id_akses",
    ur_permissions.UR_REF as "ur_akses",
    menu.SUB_KD_REF as "hak_akses",
    permissions.JNS_REF
FROM M_REFERENSI menu
JOIN M_REFERENSI permissions ON permissions.SUB_KD_REF = menu.KD_REF AND permissions.JNS_REF = 'acl_has_permissions'
JOIN M_REFERENSI ur_permissions ON ur_permissions.KD_REF = permissions.KD_REF AND ur_permissions.JNS_REF = 'ref_permissions'
WHERE menu.JNS_REF = 'acl_has_menu'
  AND menu.SUB_KD_REF = :kd_ref`

query.getRefStatusProject = `(SELECT
   JSON_OBJECT('kd_status' VALUE a.KD_STATUS,
               'ur_status' VALUE a.URAIAN,
               'tab_status' VALUE a.ID_TAB_STATUS,
               'total_data' VALUE count(b.PROJECT_ID)) data
FROM n2n.M_STATUS a
LEFT JOIN n2n.D_PROJECT b ON a.KD_STATUS = b.KD_STATUS AND b.KD_ARCHIVE IS NULL :condition
where
    a.KD_STATUS = '001'
AND a.ID_TAB_STATUS = 'SA1'
GROUP BY a.KD_STATUS, a.URAIAN, a.ID_TAB_STATUS)
UNION ALL

(SELECT
   JSON_OBJECT('kd_status' VALUE a.KD_STATUS,
               'ur_status' VALUE a.URAIAN,
               'tab_status' VALUE a.ID_TAB_STATUS,
               'total_data' VALUE count(b.PROJECT_ID)) data
FROM n2n.M_STATUS a
LEFT JOIN n2n.D_PROJECT b ON a.KD_STATUS = b.KD_STATUS AND b.KD_ARCHIVE IS NULL :condition
where
    a.KD_STATUS = '002'
AND a.ID_TAB_STATUS = 'SA1'
GROUP BY a.KD_STATUS, a.URAIAN, a.ID_TAB_STATUS)
UNION ALL
(SELECT
   JSON_OBJECT('kd_status' VALUE a.KD_STATUS,
               'ur_status' VALUE a.URAIAN,
               'tab_status' VALUE a.ID_TAB_STATUS,
               'total_data' VALUE count(b.PROJECT_ID)) data
FROM n2n.M_STATUS a
LEFT JOIN n2n.D_PROJECT b ON a.KD_STATUS = b.KD_STATUS AND b.KD_ARCHIVE IS NULL :condition
where
    a.KD_STATUS = '003'
AND a.ID_TAB_STATUS = 'SA1'
GROUP BY a.KD_STATUS, a.URAIAN, a.ID_TAB_STATUS)
UNION ALL
(SELECT
   JSON_OBJECT('kd_status' VALUE a.KD_STATUS,
               'ur_status' VALUE a.URAIAN,
               'tab_status' VALUE a.ID_TAB_STATUS,
               'total_data' VALUE count(b.PROJECT_ID)) data
FROM n2n.M_STATUS a
LEFT JOIN n2n.D_PROJECT b ON a.KD_STATUS = b.KD_STATUS AND b.KD_ARCHIVE IS NULL :condition
where
    a.KD_STATUS = '004'
AND a.ID_TAB_STATUS = 'SA1'
GROUP BY a.KD_STATUS, a.URAIAN, a.ID_TAB_STATUS) 
UNION ALL
(SELECT
   JSON_OBJECT('kd_status' VALUE a.KD_STATUS,
               'ur_status' VALUE a.URAIAN,
               'tab_status' VALUE a.ID_TAB_STATUS,
               'total_data' VALUE count(b.PROJECT_ID)) data
FROM n2n.M_STATUS a
LEFT JOIN n2n.D_PROJECT b ON a.KD_STATUS = b.KD_STATUS AND b.KD_ARCHIVE IS NULL :condition
where
    a.KD_STATUS = '005'
AND a.ID_TAB_STATUS = 'SA1'
GROUP BY a.KD_STATUS, a.URAIAN, a.ID_TAB_STATUS) 
UNION ALL
(SELECT
  JSON_OBJECT('kd_status' VALUE a.KD_STATUS,
            'ur_status' VALUE a.URAIAN,
            'tab_status' VALUE a.ID_TAB_STATUS,
            'total_data' VALUE count(b.PROJECT_ID)) data
FROM n2n.M_STATUS a
LEFT JOIN n2n.D_PROJECT b ON a.KD_STATUS = b.KD_ARCHIVE AND b.KD_ARCHIVE = '101' :condition
where
    a.KD_STATUS = '101'
AND a.ID_TAB_STATUS = 'SA2'
GROUP BY a.KD_STATUS, a.URAIAN, a.ID_TAB_STATUS)
UNION ALL
(SELECT
  JSON_OBJECT('kd_status' VALUE a.KD_STATUS,
            'ur_status' VALUE a.URAIAN,
            'tab_status' VALUE a.ID_TAB_STATUS,
            'total_data' VALUE count(b.PROJECT_ID)) data
FROM n2n.M_STATUS a
LEFT JOIN n2n.D_PROJECT b ON a.KD_STATUS = b.KD_ARCHIVE AND b.KD_ARCHIVE = '102' :condition
where
    a.KD_STATUS = '102'
AND a.ID_TAB_STATUS = 'SA2'
GROUP BY a.KD_STATUS, a.URAIAN, a.ID_TAB_STATUS)
UNION ALL
(SELECT
  JSON_OBJECT('kd_status' VALUE a.KD_STATUS,
            'ur_status' VALUE a.URAIAN,
            'tab_status' VALUE a.ID_TAB_STATUS,
            'total_data' VALUE count(b.PROJECT_ID)) data
FROM n2n.M_STATUS a
LEFT JOIN n2n.D_PROJECT b ON a.KD_STATUS = b.KD_ARCHIVE AND b.KD_ARCHIVE = '103' :condition
where
    a.KD_STATUS = '103'
AND a.ID_TAB_STATUS = 'SA2'
GROUP BY a.KD_STATUS, a.URAIAN, a.ID_TAB_STATUS)`

query.getRefStatusRevenue = `
WITH PROJECT_STATUS_LATEST AS (
    SELECT *
    FROM (
        SELECT 
            dps.*,
            ROW_NUMBER() OVER (PARTITION BY PROJECT_ID, KD_STATUS ORDER BY DATE_STATUS DESC) AS RN
        FROM D_PROJECT_STATUS dps
    )
    WHERE RN = 1
)
SELECT a.KD_STATUS, a.URAIAN, a.ID_TAB_STATUS, (
    SELECT COUNT(*) FROM 
        D_BILLING b LEFT JOIN D_PROJECT c ON c.PROJECT_ID = b.PROJECT_ID 
        LEFT JOIN M_PORTOFOLIO d ON d.PORTOFOLIO_ID = c.PORTOFOLIO_ID 
        LEFT JOIN M_CUSTOMER e ON e.CUSTOMER_ID = c.CUSTOMER_ID 
        LEFT JOIN PROJECT_STATUS_LATEST f ON f.PROJECT_ID = b.BILLING_ID AND f.KD_STATUS = b.KD_STATUS 
        LEFT JOIN D_BILLING_REVENUE g ON g.BILLING_ID = b.BILLING_ID
    WHERE b.FLAG_PARENT IN (1,2) AND (c.PROJECT_NO like :keyword
    OR upper(c.PROJECT_NAME) like upper(:keyword)
    OR upper(d.PORTOFOLIO) like upper(:keyword)
    OR upper(b.TERMIN) like upper(:keyword) 
    OR upper(b.KD_STATUS) like upper(:keyword) 
    OR upper(e.CUSTOMER_NAME) like upper(:keyword)
    OR upper(b.BILLING_CODE) like upper(:keyword) 
    OR upper(b.DESC_TERMIN) like upper(:keyword)
    OR upper(b.KETERANGAN) like upper(:keyword)
    OR c.CONTRACT_NO like :keyword 
    OR g.NO_INVOICE like :keyword 
    OR g.NO_FAKTUR like :keyword 
    OR EXISTS (
                            SELECT 1
                            FROM D_BILLING X
                            WHERE X.PARENT_id = b.BILLING_ID   -- relasi parent
                            AND X.FLAG_PARENT = 0
                            AND (
                                X.BILLING_CODE LIKE :keyword
                            )
                        )) 
    AND b.KD_STATUS = a.KD_STATUS 
    :condition
    ) AS TOTAL 
FROM M_STATUS a 
WHERE 
a.KD_STATUS IN (302, 304, 301, 402, 403, 400, 405, 401) ORDER BY DECODE(a.KD_STATUS, 302, 1, 304, 2, 301, 3, 402, 4, 403, 5, 400, 6, 405, 7, 401, 8);`;

query.getRefStatusInvoiceNonProject = `
WITH PROJECT_STATUS_LATEST AS (
    SELECT *
    FROM (
        SELECT 
            dps.*,
            ROW_NUMBER() OVER (PARTITION BY PROJECT_ID, KD_STATUS ORDER BY DATE_STATUS DESC) AS RN
        FROM D_PROJECT_STATUS dps
    )
    WHERE RN = 1
)
SELECT a.KD_STATUS, a.URAIAN, a.ID_TAB_STATUS, (
    SELECT COUNT(*) FROM 
        D_BILLING_NONPROJECT b LEFT JOIN M_PORTOFOLIO d ON d.PORTOFOLIO_ID = b.PORTOFOLIO_ID 
        LEFT JOIN M_CUSTOMER e ON e.CUSTOMER_ID = b.CUSTOMER_ID 
        LEFT JOIN PROJECT_STATUS_LATEST f ON f.PROJECT_ID = b.BILLING_ID AND f.KD_STATUS = b.KD_STATUS 
        LEFT JOIN D_BILLING_REVENUE g ON g.BILLING_ID = b.BILLING_ID
    WHERE b.FLAG_PARENT IN (1,2) AND (upper(b.PROJECT_NAME) like upper(:keyword)
    OR upper(d.PORTOFOLIO) like upper(:keyword)
    OR upper(e.CUSTOMER_NAME) like upper(:keyword)
    OR upper(b.TERMIN) like upper(:keyword) 
    OR upper(b.BILLING_CODE) like upper(:keyword) 
    OR upper(b.DESC_TERMIN) like upper(:keyword)
    OR upper(b.KETERANGAN) like upper(:keyword)
    OR g.NO_INVOICE like :keyword)
    AND b.KD_STATUS = a.KD_STATUS 
    :condition
    ) AS TOTAL 
FROM M_STATUS a 
WHERE 
a.KD_STATUS IN (400, 405, 401) ORDER BY DECODE(a.KD_STATUS, 400, 1, 405, 2, 401, 3);`;

query.getRefStatus = `SELECT a.KD_STATUS, a.URAIAN 
FROM n2n.M_STATUS a 
where
    a.ID_TAB_STATUS = :id_tab_status 
order by a.KD_STATUS asc`

query.getDataProject = `SELECT
   a.*,
   b.UR_REF as "PROJECT_KATEGORI_UR",
   c.UR_REF as "PROJECT_TYPE_UR",
   d.PORTOFOLIO as "PORTOFOLIO_UR",
   e.UR_REF as "CATEGORY_UR",
   f.CUSTOMER_NAME,
   g.UR_REF as "UR_AREA",
   h.UR_REF as "UR_STATUS"
FROM n2n.D_PROJECT a
LEFT JOIN n2n.M_REFERENSI b ON b.KD_REF = a.PROJECT_KATEGORI_ID AND b.JNS_REF = lower('PROJECT_KATEGORI_ID')
LEFT JOIN n2n.M_REFERENSI c ON c.KD_REF = a.PROJECT_TYPE_ID AND c.JNS_REF = lower('PROJECT_TYPE_ID')
LEFT JOIN n2n.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = TO_NUMBER(a.PORTOFOLIO_ID)
LEFT JOIN n2n.M_REFERENSI e ON e.KD_REF = a.CATEGORY_ID AND e.JNS_REF = lower('CATEGORY_ID')
LEFT JOIN n2n.M_CUSTOMER f ON f.CUSTOMER_ID = a.CUSTOMER_ID AND f.FLAG_AKTIF = 'Y'
LEFT JOIN n2n.M_REFERENSI g ON g.KD_REF = a.KD_AREA AND g.JNS_REF = lower('KD_AREA')
LEFT JOIN n2n.M_REFERENSI h ON h.KD_REF = a.KD_STATUS AND h.JNS_REF = lower('KD_STATUS')
where
    a.project_id = :project_id`

query.getListProject = `SELECT
   ROW_NUMBER() OVER (:order) AS row_number,
   a.*,
   b.UR_REF as "PROJECT_KATEGORI_UR",
   c.UR_REF as "PROJECT_TYPE_UR",
   d.PORTOFOLIO as "PORTOFOLIO_UR",
   e.UR_REF as "CATEGORY_UR",
   f.CUSTOMER_NAME,
   g.UR_REF as "UR_AREA",
   h.URAIAN as "UR_STATUS",
   i.UR_REF as "SPUC_UR",
   v1.SLA,
   (SELECT
        COUNT(x3.PROJECT_ID)
    FROM D_PROJECT x3
    WHERE x3.PROJECT_TYPE_ID = '2'
    AND x3.PROJECT_ACTUAL_ID = a.PROJECT_ID) AS "TOTAL_AKSELERASI",
   (SELECT TO_NUMBER(
        CASE
            WHEN
                    a.PROJECT_TYPE_ID = '1'
                AND (SELECT COUNT(x1.PROJECT_ID) FROM N2N.D_DOKUMEN x1 WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.TIPE_DOKUMEN = '01') >= 1
                AND a.KD_STATUS in ('002','003')
                AND a.KD_ARCHIVE IS NULL
                AND (SELECT COUNT(x2.PROJECT_ID) FROM N2N.D_PROJECT x2 WHERE x2.PROJECT_ACTUAL_ID = a.PROJECT_ID AND x2.PROJECT_TYPE_ID = '2') = 0
                    THEN '1' --TO ACCELERATION
            ELSE '0'
        END) "TOTAL"
    FROM DUAL) AS "TO_AKSELERASI",
    (SELECT TO_NUMBER(
        CASE
            WHEN a.PROJECT_TYPE_ID = '1' AND a.KD_ARCHIVE IS NULL THEN '1' --TO ACCELERATION
            WHEN a.PROJECT_TYPE_ID = '2'
                 AND (SELECT COUNT(x1.PROJECT_ID) FROM N2N.D_DOKUMEN x1 WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.TIPE_DOKUMEN = '01') >= 1
                 AND a.KD_STATUS in ('002')
                 AND a.KD_ARCHIVE IS NULL 
                THEN '1' --MARK AS 
            WHEN (SELECT COUNT(*) FROM M_CUSTOMER WHERE CUSTOMER_ID = a.CUSTOMER_ID) <= 0 THEN 
                '0' 
            ELSE '0'
        END) "TOTAL"
    FROM DUAL) AS "TO_MARK",
    (CASE
        WHEN a.PROJECT_TYPE_ID = '2' THEN 'Tipe Project Bukan Project Normal'
        WHEN a.PROJECT_TYPE_ID = '1'
            AND (SELECT COUNT(x1.PROJECT_ID) FROM N2N.D_DOKUMEN x1 WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.TIPE_DOKUMEN = '01') = 0
                THEN 'Belum terdapat Dokumen Pendukung'
        WHEN a.PROJECT_TYPE_ID = '1'
            AND a.KD_STATUS NOT IN ('002','003') 
                THEN 'Status Project Tidak Dapat Dilakukan Perubahan Tipe'
        WHEN a.PROJECT_TYPE_ID = '1' 
            AND a.KD_ARCHIVE IS NOT NULL 
                THEN 'Status Project Sedang di Archive'
        WHEN a.PROJECT_TYPE_ID = '1' 
            AND (SELECT COUNT(x2.PROJECT_ID) FROM N2N.D_PROJECT x2 WHERE x2.PROJECT_ACTUAL_ID = a.PROJECT_ID AND x2.PROJECT_TYPE_ID = '2') > 0
                THEN 'Project Telah di Actualkan' --TO ACCELERATION 
        ELSE '' END
    ) AS "KET_AKSELERASI", 
    (CASE
        WHEN a.PROJECT_TYPE_ID = '2' AND a.KD_STATUS = '003' THEN 'Project Akselerasi Tidak Dapat Dilakukan Perubahan Menjadi Won'
        WHEN a.KD_STATUS = '002' AND (SELECT COUNT(x1.PROJECT_ID) FROM N2N.D_DOKUMEN x1 WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.TIPE_DOKUMEN = '01') = 0
            THEN 'Belum terdapat Dokumen Pendukung' 
        WHEN (SELECT COUNT(*) FROM M_CUSTOMER WHERE CUSTOMER_ID = a.CUSTOMER_ID) <= 0 THEN 
            'Belum Memilih Customer' 
        ELSE '' END
    ) AS "KET_MARK", 
    CASE 
        WHEN (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS = '302') > 0 THEN
            'Rejected' 
        WHEN (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS IN ('301','400','401','402')) > 0 AND (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS = '302') = 0 THEN
            'Sent' 
        ELSE '-'
    END AS STATUS_BILLING 
FROM n2n.D_PROJECT a 
LEFT JOIN n2n.M_REFERENSI b ON b.KD_REF = a.PROJECT_KATEGORI_ID AND b.JNS_REF = lower('PROJECT_KATEGORI_ID')
LEFT JOIN n2n.M_REFERENSI c ON c.KD_REF = a.PROJECT_TYPE_ID AND c.JNS_REF = lower('PROJECT_TYPE_ID')
LEFT JOIN n2n.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = TO_NUMBER(a.PORTOFOLIO_ID)
LEFT JOIN n2n.M_REFERENSI e ON e.KD_REF = a.CATEGORY_ID AND e.JNS_REF = lower('CATEGORY_ID')
LEFT JOIN n2n.M_CUSTOMER f ON f.CUSTOMER_ID = a.CUSTOMER_ID AND f.FLAG_AKTIF = 'Y'
LEFT JOIN n2n.M_REFERENSI g ON g.KD_REF = a.KD_AREA AND g.JNS_REF = lower('KD_AREA')
LEFT JOIN n2n.M_STATUS h ON h.KD_STATUS = a.KD_STATUS AND h.ID_TAB_STATUS = 'SA1' 
LEFT JOIN n2n.M_REFERENSI i ON i.KD_REF = a.KD_SPUC AND i.JNS_REF = lower('KD_SPUC')
LEFT JOIN n2n.V_SLA v1 ON v1.PROJECT_ID = a.PROJECT_ID 
:cond_billing 
WHERE
    (a.PROJECT_NO like :keyword
    OR upper(a.PROJECT_NO_OLD) like :keyword 
    OR upper(a.PROJECT_NAME) like upper(:keyword)
    OR upper(d.PORTOFOLIO) like upper(:keyword)
    OR upper(c.UR_REF) like upper(:keyword)
    OR upper(f.CUSTOMER_NAME) like upper(:keyword)
    OR a.CONTRACT_NO like :keyword
    OR upper(h.URAIAN) like upper(:keyword)) :archive_condition
:order
OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`

query.getListProjectNew = `
    WITH ProjectCounts AS (
        SELECT 
            p.PROJECT_ID,
            SUM(CASE WHEN d.TIPE_DOKUMEN = '01' THEN 1 ELSE 0 END) AS DOC_COUNT,
            SUM(CASE WHEN p2.PROJECT_TYPE_ID = '2' AND p2.PROJECT_ACTUAL_ID = p.PROJECT_ID THEN 1 ELSE 0 END) AS TOTAL_AKSELERASI
        FROM N2N.D_PROJECT p
        LEFT JOIN N2N.D_DOKUMEN d ON d.PROJECT_ID = p.PROJECT_ID
        LEFT JOIN N2N.D_PROJECT p2 ON p2.PROJECT_ACTUAL_ID = p.PROJECT_ID AND p2.PROJECT_TYPE_ID = '2'
        GROUP BY p.PROJECT_ID
    ),
    BillingStatus AS (
        SELECT 
            PROJECT_ID,
            CASE 
                WHEN SUM(CASE WHEN KD_STATUS = '302' THEN 1 ELSE 0 END) > 0 THEN 'Rejected'
                WHEN SUM(CASE WHEN KD_STATUS IN ('301', '400', '401', '402') THEN 1 ELSE 0 END) > 0 
                    AND SUM(CASE WHEN KD_STATUS = '302' THEN 1 ELSE 0 END) = 0 THEN 'Sent'
                ELSE '-'
            END AS STATUS_BILLING
        FROM N2N.D_BILLING
        GROUP BY PROJECT_ID
    ),
    CustomerCheck AS (
        SELECT p.PROJECT_ID, CASE WHEN COUNT(c.CUSTOMER_ID) > 0 THEN 1 ELSE 0 END AS HAS_CUSTOMER
        FROM N2N.D_PROJECT p
        LEFT JOIN N2N.M_CUSTOMER c ON c.CUSTOMER_ID = p.CUSTOMER_ID
        GROUP BY p.PROJECT_ID
    ),
    ProjectDetails AS (
        SELECT
            bl.PROJECT_ACTUAL_ID,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'PROJECT_ID' VALUE bl.PROJECT_ID,
                    'PROJECT_NAME' VALUE bl.PROJECT_NAME,
                    'PROJECT_NO' VALUE bl.PROJECT_NO,
                    'PORTOFOLIO' VALUE mp.PORTOFOLIO,
                    'CUSTOMER' VALUE mc.CUSTOMER_NAME,
                    'SPUC' VALUE bl.KD_SPUC,
                    'NILAI_KONTRAK' VALUE bl.NILAI_KONTRAK,
                    'NOMOR_KONTRAK' VALUE bl.CONTRACT_NO,
                    'MARGIN_KONTRAK' VALUE bl.MARGIN_KONTRAK,
                    'COGS' VALUE bl.COGS,
                    'NIP_SALES' VALUE bl.NIP_SALES,
                    'TIPE_PROJECT' VALUE mr1.UR_REF,
                    'KATEGORI_PROJECT' VALUE mr2.UR_REF,
                    'PROJECT_MODEL' VALUE mr3.UR_REF,
                    'NAMA_SALES' VALUE bl.NAMA_SALES
                )
                RETURNING VARCHAR2(4000)
            ) AS DETAIL_PROJECT
        FROM N2N.D_PROJECT bl
        JOIN N2N.M_PORTOFOLIO mp 
            ON mp.PORTOFOLIO_ID = bl.PORTOFOLIO_ID
        JOIN N2N.M_CUSTOMER mc 
            ON mc.CUSTOMER_ID = bl.CUSTOMER_ID
        LEFT JOIN N2N.M_REFERENSI mr1 
            ON mr1.KD_REF = bl.PROJECT_TYPE_ID 
        AND mr1.JNS_REF = 'project_type_id'
        LEFT JOIN N2N.M_REFERENSI mr2 
            ON mr2.KD_REF = bl.CATEGORY_ID 
        AND mr2.JNS_REF = 'category_id'
        LEFT JOIN N2N.M_REFERENSI mr3 
            ON mr3.KD_REF = bl.PROJECT_MODEL_ID 
        AND mr3.JNS_REF = 'category_project'
        WHERE bl.PROJECT_ACTUAL_ID IS NOT NULL
        GROUP BY bl.PROJECT_ACTUAL_ID
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY a.CREATED_AT DESC) AS row_number,
        a.*,
        b.UR_REF AS "PROJECT_KATEGORI_UR",
        c.UR_REF AS "PROJECT_TYPE_UR",
        d.PORTOFOLIO AS "PORTOFOLIO_UR",
        e.UR_REF AS "CATEGORY_UR",
        f.CUSTOMER_NAME,
        g.UR_REF AS "UR_AREA",
        h.URAIAN AS "UR_STATUS",
        i.UR_REF AS "SPUC_UR",
        v1.SLA,
        pc.TOTAL_AKSELERASI,
        CASE 
            WHEN a.PROJECT_TYPE_ID = '1'
                AND pc.DOC_COUNT >= 1
                AND a.KD_STATUS IN ('002', '003')
                AND a.KD_ARCHIVE IS NULL
                AND pc.TOTAL_AKSELERASI = 0 THEN 1
            ELSE 0
        END AS "TO_AKSELERASI",
        CASE 
            WHEN a.PROJECT_TYPE_ID = '1' AND a.KD_ARCHIVE IS NULL THEN 1
            WHEN a.PROJECT_TYPE_ID = '2'
                AND pc.DOC_COUNT >= 1
                AND a.KD_STATUS = '002'
                AND a.KD_ARCHIVE IS NULL THEN 1
            WHEN a.PROJECT_TYPE_ID = '2'
                AND a.KD_STATUS = '001'
                AND a.KD_ARCHIVE IS NULL THEN 1 
            WHEN cc.HAS_CUSTOMER = 0 THEN 0
            ELSE 0
        END AS "TO_MARK",
        CASE
            WHEN a.PROJECT_TYPE_ID = '2' THEN 'Tipe Project Bukan Project Normal'
            WHEN a.PROJECT_TYPE_ID = '1' AND pc.DOC_COUNT = 0 THEN 'Belum terdapat Dokumen Pendukung'
            WHEN a.PROJECT_TYPE_ID = '1' AND a.KD_STATUS NOT IN ('002', '003') THEN 'Status Project Tidak Dapat Dilakukan Perubahan Tipe'
            WHEN a.PROJECT_TYPE_ID = '1' AND a.KD_ARCHIVE IS NOT NULL THEN 'Status Project Sedang di Archive'
            WHEN a.PROJECT_TYPE_ID = '1' AND pc.TOTAL_AKSELERASI > 0 THEN 'Project Telah di Actualkan'
            ELSE ''
        END AS "KET_AKSELERASI",
        CASE
            WHEN a.PROJECT_TYPE_ID = '2' AND a.KD_STATUS = '003' THEN 'Project Akselerasi Tidak Dapat Dilakukan Perubahan Menjadi Won'
            WHEN a.KD_STATUS = '002' AND pc.DOC_COUNT = 0 THEN 'Belum terdapat Dokumen Pendukung'
            WHEN cc.HAS_CUSTOMER = 0 THEN 'Belum Memilih Customer'
            ELSE ''
        END AS "KET_MARK",
        bs.STATUS_BILLING,
        NVL(pd.DETAIL_PROJECT, '[]') AS DETAIL_PROJECT
    FROM N2N.D_PROJECT a
    LEFT JOIN N2N.M_REFERENSI b ON b.KD_REF = a.PROJECT_KATEGORI_ID AND b.JNS_REF = 'project_kategori_id'
    LEFT JOIN N2N.M_REFERENSI c ON c.KD_REF = a.PROJECT_TYPE_ID AND c.JNS_REF = 'project_type_id'
    LEFT JOIN N2N.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = TO_NUMBER(a.PORTOFOLIO_ID)
    LEFT JOIN N2N.M_REFERENSI e ON e.KD_REF = a.CATEGORY_ID AND e.JNS_REF = 'category_id'
    LEFT JOIN N2N.M_CUSTOMER f ON f.CUSTOMER_ID = a.CUSTOMER_ID AND f.FLAG_AKTIF = 'Y'
    LEFT JOIN N2N.M_REFERENSI g ON g.KD_REF = a.KD_AREA AND g.JNS_REF = 'kd_area'
    LEFT JOIN N2N.M_STATUS h ON h.KD_STATUS = a.KD_STATUS AND h.ID_TAB_STATUS = 'SA1'
    LEFT JOIN N2N.M_REFERENSI i ON i.KD_REF = a.KD_SPUC AND i.JNS_REF = 'kd_spuc'
    LEFT JOIN N2N.V_SLA v1 ON v1.PROJECT_ID = a.PROJECT_ID
    LEFT JOIN ProjectCounts pc ON pc.PROJECT_ID = a.PROJECT_ID
    LEFT JOIN BillingStatus bs ON bs.PROJECT_ID = a.PROJECT_ID
    LEFT JOIN CustomerCheck cc ON cc.PROJECT_ID = a.PROJECT_ID
    LEFT JOIN ProjectDetails pd ON pd.PROJECT_ACTUAL_ID = a.PROJECT_ID
    :cond_billing
    WHERE
    (a.PROJECT_NO LIKE :keyword
     OR UPPER(a.PROJECT_NO_OLD) LIKE :keyword
     OR UPPER(a.PROJECT_NAME) LIKE UPPER(:keyword)
     OR UPPER(a.NAMA_SALES) LIKE UPPER(:keyword)
     OR UPPER(d.PORTOFOLIO) LIKE UPPER(:keyword)
     OR UPPER(c.UR_REF) LIKE UPPER(:keyword)
     OR UPPER(f.CUSTOMER_NAME) LIKE UPPER(:keyword)
     OR a.CONTRACT_NO LIKE :keyword
     OR UPPER(h.URAIAN) LIKE UPPER(:keyword)):archive_condition
    :order
    OFFSET (:page - 1) * :limit ROWS
    FETCH NEXT :limit ROWS ONLY;
`

query.searchProject = `SELECT 
    CASE WHEN a.KD_ARCHIVE IS NOT NULL THEN i.URAIAN 
    ELSE h.URAIAN END AS "ur_status",
    CASE WHEN a.KD_ARCHIVE IS NOT NULL THEN i.KD_STATUS 
    ELSE h.KD_STATUS END AS "status",
    CASE WHEN a.KD_ARCHIVE IS NOT NULL THEN i.ID_TAB_STATUS 
    ELSE h.ID_TAB_STATUS END AS "tab_status" 
FROM n2n.D_PROJECT a 
LEFT JOIN n2n.M_REFERENSI c ON c.KD_REF = a.PROJECT_TYPE_ID AND c.JNS_REF = lower('PROJECT_TYPE_ID') 
LEFT JOIN n2n.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = TO_NUMBER(a.PORTOFOLIO_ID) 
LEFT JOIN n2n.M_CUSTOMER f ON f.CUSTOMER_ID = a.CUSTOMER_ID AND f.FLAG_AKTIF = 'Y'
LEFT JOIN n2n.M_REFERENSI g ON g.KD_REF = a.KD_AREA AND g.JNS_REF = lower('KD_AREA')
LEFT JOIN n2n.M_STATUS h ON h.KD_STATUS = a.KD_STATUS AND a.KD_ARCHIVE IS NULL 
LEFT JOIN n2n.M_STATUS i ON i.KD_STATUS = a.KD_ARCHIVE AND a.KD_ARCHIVE IS NOT NULL 
WHERE
    (a.PROJECT_NO like :keyword
    OR upper(a.PROJECT_NO_OLD) like :keyword 
    OR upper(a.PROJECT_NAME) like upper(:keyword)
    OR upper(a.NAMA_SALES) like upper(:keyword)
    OR upper(d.PORTOFOLIO) like upper(:keyword)
    OR upper(c.UR_REF) like upper(:keyword)
    OR upper(f.CUSTOMER_NAME) like upper(:keyword)
    OR a.CONTRACT_NO like :keyword
    OR upper(h.URAIAN) like upper(:keyword)) 
    --AND TRUNC(a.CREATED_AT) BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') AND TO_DATE(:endDate, 'YYYY-MM-DD')
ORDER BY CASE WHEN a.KD_ARCHIVE IS NOT NULL THEN i.KD_STATUS ELSE h.KD_STATUS END ASC`

query.postListProject = `SELECT
   ROW_NUMBER() OVER (:order) AS row_number,
   a.*,
   b.UR_REF as "PROJECT_KATEGORI_UR",
   c.UR_REF as "PROJECT_TYPE_UR",
   d.PORTOFOLIO as "PORTOFOLIO_UR",
   e.UR_REF as "CATEGORY_UR",
   f.CUSTOMER_NAME,
   g.UR_REF as "UR_AREA",
   h.URAIAN as "UR_STATUS",
   v1.SLA,
   (SELECT
        COUNT(x3.PROJECT_ID)
    FROM D_PROJECT x3
    WHERE x3.PROJECT_TYPE_ID = '2'
    AND x3.PROJECT_ACTUAL_ID = a.PROJECT_ID) AS "TOTAL_AKSELERASI",
   (SELECT TO_NUMBER(
        CASE
            WHEN
                    a.PROJECT_TYPE_ID = '1'
                AND (SELECT COUNT(x1.PROJECT_ID) FROM N2N.D_DOKUMEN x1 WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.TIPE_DOKUMEN = '01') >= 1
                AND a.KD_STATUS in ('002','003')
                AND a.KD_ARCHIVE IS NULL
                AND (SELECT COUNT(x2.PROJECT_ID) FROM N2N.D_PROJECT x2 WHERE x2.PROJECT_ACTUAL_ID = a.PROJECT_ID AND x2.PROJECT_TYPE_ID = '2') = 0
                    THEN '1' --TO ACCELERATION
            ELSE '0'
        END) "TOTAL"
    FROM DUAL) AS "TO_AKSELERASI",
    (SELECT TO_NUMBER(
        CASE
            WHEN a.PROJECT_TYPE_ID = '1' AND a.KD_ARCHIVE IS NULL THEN '1' --TO ACCELERATION
            WHEN a.PROJECT_TYPE_ID = '2'
                 AND (SELECT COUNT(x1.PROJECT_ID) FROM N2N.D_DOKUMEN x1 WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.TIPE_DOKUMEN = '01') >= 1
                 AND a.KD_STATUS in ('002')
                 AND a.KD_ARCHIVE IS NULL 
                THEN '1' --MARK AS 
            WHEN (SELECT COUNT(*) FROM M_CUSTOMER WHERE CUSTOMER_ID = a.CUSTOMER_ID) <= 0 THEN 
                '0' 
            ELSE '0'
        END) "TOTAL"
    FROM DUAL) AS "TO_MARK",
    (CASE
        WHEN a.PROJECT_TYPE_ID = '2' THEN 'Tipe Project Bukan Project Normal'
        WHEN a.PROJECT_TYPE_ID = '1'
            AND (SELECT COUNT(x1.PROJECT_ID) FROM N2N.D_DOKUMEN x1 WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.TIPE_DOKUMEN = '01') = 0
                THEN 'Belum terdapat Dokumen Pendukung'
        WHEN a.PROJECT_TYPE_ID = '1'
            AND a.KD_STATUS NOT IN ('002','003') 
                THEN 'Status Project Tidak Dapat Dilakukan Perubahan Tipe'
        WHEN a.PROJECT_TYPE_ID = '1' 
            AND a.KD_ARCHIVE IS NOT NULL 
                THEN 'Status Project Sedang di Archive'
        WHEN a.PROJECT_TYPE_ID = '1' 
            AND (SELECT COUNT(x2.PROJECT_ID) FROM N2N.D_PROJECT x2 WHERE x2.PROJECT_ACTUAL_ID = a.PROJECT_ID AND x2.PROJECT_TYPE_ID = '2') > 0
                THEN 'Project Telah di Actualkan' --TO ACCELERATION 
        ELSE '' END
    ) AS "KET_AKSELERASI", 
    (CASE
        WHEN a.PROJECT_TYPE_ID = '2' AND a.KD_STATUS = '003' THEN 'Project Akselerasi Tidak Dapat Dilakukan Perubahan Menjadi Won'
        WHEN a.KD_STATUS = '002' AND (SELECT COUNT(x1.PROJECT_ID) FROM N2N.D_DOKUMEN x1 WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.TIPE_DOKUMEN = '01') = 0
            THEN 'Belum terdapat Dokumen Pendukung' 
        WHEN (SELECT COUNT(*) FROM M_CUSTOMER WHERE CUSTOMER_ID = a.CUSTOMER_ID) <= 0 THEN 
            'Belum Memilih Customer' 
        ELSE '' END
    ) AS "KET_MARK", 
    CASE 
        WHEN (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS = '302') > 0 THEN
            'Rejected' 
        WHEN (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS IN ('301','400','401','402')) > 0 AND (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS = '302') = 0 THEN
            'Sent' 
        ELSE '-'
    END AS STATUS_BILLING 
FROM n2n.D_PROJECT a 
LEFT JOIN n2n.M_REFERENSI b ON b.KD_REF = a.PROJECT_KATEGORI_ID AND b.JNS_REF = lower('PROJECT_KATEGORI_ID')
LEFT JOIN n2n.M_REFERENSI c ON c.KD_REF = a.PROJECT_TYPE_ID AND c.JNS_REF = lower('PROJECT_TYPE_ID')
LEFT JOIN n2n.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = TO_NUMBER(a.PORTOFOLIO_ID)
LEFT JOIN n2n.M_REFERENSI e ON e.KD_REF = a.CATEGORY_ID AND e.JNS_REF = lower('CATEGORY_ID')
LEFT JOIN n2n.M_CUSTOMER f ON f.CUSTOMER_ID = a.CUSTOMER_ID AND f.FLAG_AKTIF = 'Y'
LEFT JOIN n2n.M_REFERENSI g ON g.KD_REF = a.KD_AREA AND g.JNS_REF = lower('KD_AREA')
LEFT JOIN n2n.M_STATUS h ON h.KD_STATUS = a.KD_STATUS AND h.ID_TAB_STATUS = 'SA1' 
LEFT JOIN n2n.V_SLA v1 ON v1.PROJECT_ID = a.PROJECT_ID :cond_billing 
WHERE
    (a.PROJECT_NO like :keyword
    OR upper(a.PROJECT_NAME) like upper(:keyword)
    OR upper(d.PORTOFOLIO) like upper(:keyword)
    OR upper(c.UR_REF) like upper(:keyword)
    OR upper(f.CUSTOMER_NAME) like upper(:keyword)
    OR a.CONTRACT_NO like :keyword
    OR upper(h.URAIAN) like upper(:keyword)) :archive_condition :searchHeader
    :order
OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`

query.getListBillingRealization = `SELECT
   ROW_NUMBER() OVER (:order) AS row_number,
   a.* FROM ((SELECT 
   a.*,
   b.UR_REF as "PROJECT_KATEGORI_UR",
   c.UR_REF as "PROJECT_TYPE_UR",
   d.PORTOFOLIO as "PORTOFOLIO_UR",
   e.UR_REF as "CATEGORY_UR",
   f.CUSTOMER_NAME,
   g.UR_REF as "UR_AREA",
   h.URAIAN as "UR_STATUS",
   CASE 
        WHEN (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS = '302') > 0 THEN
            'Rejected' 
        WHEN (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS IN ('301','400','401','402')) > 0 AND (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS = '302') = 0 THEN
            'Sent' 
        ELSE '-'
    END AS STATUS_BILLING,
    mr1.UR_REF AS KATEGORI_REVENUE_UR  
FROM n2n.D_PROJECT a  
LEFT JOIN (SELECT PROJECT_ID FROM N2N.D_BILLING GROUP BY PROJECT_ID) i ON i.PROJECT_ID = a.PROJECT_ID 
LEFT JOIN n2n.M_REFERENSI b ON b.KD_REF = a.PROJECT_KATEGORI_ID AND b.JNS_REF = lower('PROJECT_KATEGORI_ID')
LEFT JOIN n2n.M_REFERENSI c ON c.KD_REF = a.PROJECT_TYPE_ID AND c.JNS_REF = lower('PROJECT_TYPE_ID')
LEFT JOIN n2n.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = TO_NUMBER(a.PORTOFOLIO_ID)
LEFT JOIN n2n.M_REFERENSI e ON e.KD_REF = a.CATEGORY_ID AND e.JNS_REF = lower('CATEGORY_ID')
LEFT JOIN n2n.M_CUSTOMER f ON f.CUSTOMER_ID = a.CUSTOMER_ID AND f.FLAG_AKTIF = 'Y'
LEFT JOIN n2n.M_REFERENSI g ON g.KD_REF = a.KD_AREA AND g.JNS_REF = lower('KD_AREA') 
LEFT JOIN n2n.M_REFERENSI mr1 ON mr1.KD_REF = a.KATEGORI_REVENUE AND mr1.JNS_REF = lower('kategori_revenue') 
LEFT JOIN n2n.M_STATUS h ON h.KD_STATUS = a.KD_STATUS AND h.ID_TAB_STATUS = 'SA1' 
WHERE a.PROJECT_TYPE_ID = 1 AND a.KD_STATUS = '005' :condition1)  
--UNION ALL 
--(SELECT 
  -- a.*,
   --b.UR_REF as "PROJECT_KATEGORI_UR",
   --c.UR_REF as "PROJECT_TYPE_UR",
   --d.PORTOFOLIO as "PORTOFOLIO_UR",
   --e.UR_REF as "CATEGORY_UR",
   --f.CUSTOMER_NAME,
   --g.UR_REF as "UR_AREA",
   --h.URAIAN as "UR_STATUS",
   --CASE 
        --WHEN (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS = '302') > 0 THEN
            --'Rejected' 
        --WHEN (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS IN ('301','400','401','402')) > 0 AND (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS = '302') = 0 THEN
            --'Sent' 
        --ELSE '-'
    --END AS STATUS_BILLING 
--FROM n2n.D_PROJECT a 
--INNER JOIN (SELECT PROJECT_ID FROM N2N.D_BILLING GROUP BY PROJECT_ID) i ON i.PROJECT_ID = a.PROJECT_ID 
--LEFT JOIN n2n.M_REFERENSI b ON b.KD_REF = a.PROJECT_KATEGORI_ID AND b.JNS_REF = lower('PROJECT_KATEGORI_ID')
--LEFT JOIN n2n.M_REFERENSI c ON c.KD_REF = a.PROJECT_TYPE_ID AND c.JNS_REF = lower('PROJECT_TYPE_ID')
--LEFT JOIN n2n.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = TO_NUMBER(a.PORTOFOLIO_ID)
--LEFT JOIN n2n.M_REFERENSI e ON e.KD_REF = a.CATEGORY_ID AND e.JNS_REF = lower('CATEGORY_ID')
--LEFT JOIN n2n.M_CUSTOMER f ON f.CUSTOMER_ID = a.CUSTOMER_ID AND f.FLAG_AKTIF = 'Y'
--LEFT JOIN n2n.M_REFERENSI g ON g.KD_REF = a.KD_AREA AND g.JNS_REF = lower('KD_AREA')
--LEFT JOIN n2n.M_STATUS h ON h.KD_STATUS = a.KD_STATUS AND h.ID_TAB_STATUS = 'SA1' 
--WHERE a.PROJECT_TYPE_ID = 2 AND a.PROJECT_ACTUAL_ID IS NOT NULL AND 
    --(SELECT x.KD_STATUS FROM D_PROJECT x WHERE x.PROJECT_ID = a.PROJECT_ACTUAL_ID) = '005' 
    --:condition1)
    ) a 
WHERE
        -- (a.PROJECT_NO like :keyword
    -- OR upper(a.PROJECT_NAME) like upper(:keyword)
    -- OR upper(a.PORTOFOLIO_UR) like upper(:keyword)
    -- OR upper(a.PROJECT_TYPE_UR) like upper(:keyword)
    -- OR upper(a.CUSTOMER_NAME) like upper(:keyword)
    -- OR upper(a.CONTRACT_NO) like upper(:keyword) 
    -- OR upper(a.UR_STATUS) like upper(:keyword))
    1=1
    -- Filter berdasarkan NIK jika parameter nik diisi
    --AND (
    --    (:nik IS NULL OR :nik = '')
    --    OR
    --    EXISTS (
    --        SELECT 1 
    --        FROM N2N.D_PERSONIL_DETAIL pd
    --        INNER JOIN N2N.D_PERSONIL p ON p.PERSONEL_ID = pd.PERSONEL_ID
    --        WHERE pd.NIK = :nik
    --          AND p.PROJECT_ID = a.PROJECT_ID
    --    )
    --)
    -- Filter berdasarkan keyword jika parameter keyword diisi
    AND (
        (:keyword IS NULL OR :keyword = '')
        OR
        (
            a.PROJECT_NO LIKE '%' || :keyword || '%'
            OR UPPER(a.PROJECT_NAME) LIKE '%' || UPPER(:keyword) || '%'
            OR UPPER(a.PORTOFOLIO_UR) LIKE '%' || UPPER(:keyword) || '%'
            OR UPPER(a.PROJECT_TYPE_UR) LIKE '%' || UPPER(:keyword) || '%'
            OR UPPER(a.CUSTOMER_NAME) LIKE '%' || UPPER(:keyword) || '%'
            OR UPPER(a.CONTRACT_NO) LIKE '%' || UPPER(:keyword) || '%'
            OR UPPER(a.UR_STATUS) LIKE '%' || UPPER(:keyword) || '%'
        )
    )
:order 
OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`

query.getListBillingCollections = `
WITH LATEST_STATUS AS (SELECT PROJECT_ID,
                              MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '400', '401', '402', '403', '405') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
                              MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
                              MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
                              MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
                              MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
                              MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
                              MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
                              MAX(CASE
                                      WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
                                      ELSE CREATED_BY
                                  END)                                                                      AS NAMA_DELIVERY
                       FROM D_PROJECT_STATUS
                       WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '405') 
                       GROUP BY PROJECT_ID),
SURAT_TAGIHAN AS (SELECT a.NO_DOKUMEN, a.TGL_DOKUMEN, a.URL_DOKUMEN, a.FLAG_DELETE, a.JSON_DOK, a.NOTES, a.NO_REF, b.BILLING_ID, ROW_NUMBER() OVER (PARTITION BY b.BILLING_ID ORDER BY a.CREATED_AT DESC) AS RN FROM D_DOKUMEN a INNER JOIN D_BILLING_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID WHERE a.JNS_DOKUMEN = '08001' ORDER BY a.CREATED_AT DESC) 
, BAMK AS (
	SELECT 
		a.PROJECT_ID
		, c.DOKUMEN_ID
		, c.NO_DOKUMEN
		, c.TGL_DOKUMEN
	FROM D_PROJECT a
	LEFT JOIN D_DOKUMEN c ON a.PROJECT_ID = c.PROJECT_ID
	WHERE 1=1
	AND c.JNS_DOKUMEN = '01006'
)
, PERSENTASI_LAPORAN AS (
	SELECT A.PROJECT_ID,
	       A.BILLING_ID,
	       A.PERCENTAGE,
	       A.NILAI_PELAPORAN,
	       SUM(A.PERCENTAGE) OVER (PARTITION BY A.PROJECT_ID)      AS T_PERCENTAGE,
	       SUM(A.NILAI_PELAPORAN) OVER (PARTITION BY A.PROJECT_ID) AS T_NILAI_PELAPORAN
	FROM D_PROJECT_PROGRESS A
    JOIN D_BILLING B ON B.BILLING_ID = A.BILLING_ID
)
SELECT 
   ROW_NUMBER() OVER (:order) AS row_number,
   z.BILLING_ID,
   z.BILLING_CODE,
   z.BILLING_NOTA,
   z.PROJECT_ID,
   z.PID_PO,
   z.KD_STATUS,
   z.CREATED_AT,
   z.CREATED_BY,
   z.UPDATED_AT,
   z.UPDATED_BY,
   z.EST_BILLING,
   z.EST_BULAN_BILLING,
   z.EST_PERIODE_BILLING,
   z.REAL_BILLING,
   z.REAL_BULAN_BILLING,
   z.REAL_PERIODE_BILLING,
   z.TERMIN,
   z.DESC_TERMIN,
   z.KETERANGAN,
   z.FLAG_PARENT,
   z.PARENT_ID,
   z.DIVISI_ID,
   z.PROJECT_NO,
   z.PROJECT_NO_OLD,
   z.PROJECT_NAME,
   z.CONTRACT_NO, 
   z.CONTRACT_DATE,
   z.NILAI_KONTRAK,
   z.CUSTOMER_ID,
   z.CUSTOMER_NAME,
   z.ADDRESS CUSTOMER_ADDRESS,
   z.COMP_CODE CUSTOMER_COMP_CODE,
   z.KOTA CUSTOMER_KOTA,
   z.NO_FAKTUR,
   z.UR_KATEGORI_PROJECT,
   z.FLAG_CHILD,
   z.REQ_DOC,
   z.ID_REQ_DOC,
   z.NIP_REQ_DOC,
   z.NO_INVOICE,
   z.NOMINAL_DPP,
   z.TARIF_PPN,
   z.NOMINAL_INVOICE,
   z.NIP_SALES,
   z.NAMA_SALES,
   z.TGL_INVOICE,
   z.TGL_SURAT_TAGIHAN,
   z.AGING_PIUTANG,
   x.DOKUMEN_ID BAMK_ID,
   x.NO_DOKUMEN BAMK_NO,
   DECODE(x.TGL_DOKUMEN,NULL,NULL,TO_CHAR(x.TGL_DOKUMEN,'DD-MM-YYYY')) BAMK_DATE,
   w.PERCENTAGE,
   w.NILAI_PELAPORAN,
   w.T_PERCENTAGE,
   w.T_NILAI_PELAPORAN,
   ST.NO_REF,
   ST.NO_DOKUMEN AS NO_SURAT_TAGIHAN,
   CASE 
    WHEN ST.URL_DOKUMEN IS NOT NULL AND SUBSTR(ST.URL_DOKUMEN, 1, 5) = 'https' 
        THEN ST.URL_DOKUMEN 
    WHEN ST.URL_DOKUMEN IS NOT NULL AND SUBSTR(ST.URL_DOKUMEN, 1, 5) != 'https'
        THEN CONCAT('${LINK_DOK}', ST.URL_DOKUMEN) 
    ELSE ST.URL_DOKUMEN 
   END AS URL_SURAT_TAGIHAN,
   --ST.TGL_DOKUMEN AS TGL_SURAT_TAGIHAN,
   ST.NOTES AS NOTE_SURAT_TAGIHAN,
   ST.FLAG_DELETE AS VALID_SURAT_TAGIHAN,
   TO_CHAR(z.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED,
   CASE 
        WHEN z.KD_STATUS = '304' THEN
            'Faktur Done' 
        WHEN z.KD_STATUS = '303' THEN
            'Req. Faktur' 
        WHEN z.KD_STATUS = '302' THEN
            'Rejected' 
        WHEN z.KD_STATUS = '301' THEN
            'Sent' 
        WHEN z.KD_STATUS = '400' THEN
            'Invoice' 
        WHEN z.KD_STATUS = '401' THEN
            'Paid' 
        WHEN z.KD_STATUS = '402' THEN
            'PYMAD' 
        WHEN z.KD_STATUS = '406' THEN
            'Batal PYMAD' 
        WHEN z.KD_STATUS = '403' THEN
            'Completed' 
        WHEN z.KD_STATUS = '405' THEN
            'Surat Tagihan' 
        ELSE '-'
    END AS STATUS_BILLING,
    CASE 
        WHEN z.KD_STATUS = '300' THEN
            'T'  
        ELSE 'F' 
    END AS STATUS_PYMAD,
    (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = z.BILLING_ID AND x1.KD_STATUS = '300' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA_START",
    (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = z.BILLING_ID AND x1.KD_STATUS = '301' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA_END",
    CASE WHEN (SELECT COUNT(dbd.BILLING_DETAIL_ID) FROM n2n.D_BILLING_DOKUMEN dbd INNER JOIN n2n.D_DOKUMEN dd ON dd.DOKUMEN_ID = dbd.DOKUMEN_ID WHERE dbd.BILLING_ID = z.BILLING_ID AND dd.JNS_DOKUMEN = '04005' AND dd.URL_DOKUMEN IS NOT NULL) > 0 THEN 'T' ELSE 'F' END AS LAPORAN_PEKERJAAN,
    CASE WHEN (SELECT COUNT(dbd.BILLING_DETAIL_ID) FROM n2n.D_BILLING_DOKUMEN dbd INNER JOIN n2n.D_DOKUMEN dd ON dd.DOKUMEN_ID = dbd.DOKUMEN_ID WHERE dbd.BILLING_ID = z.BILLING_ID AND dd.JNS_DOKUMEN = '04006' AND dd.URL_DOKUMEN IS NOT NULL) > 0 THEN 'T' ELSE 'F' END AS BAST,
    CASE WHEN (SELECT COUNT(dbd.BILLING_DETAIL_ID) FROM n2n.D_BILLING_DOKUMEN dbd INNER JOIN n2n.D_DOKUMEN dd ON dd.DOKUMEN_ID = dbd.DOKUMEN_ID WHERE dbd.BILLING_ID = z.BILLING_ID AND dd.JNS_DOKUMEN = '04007' AND dd.URL_DOKUMEN IS NOT NULL) > 0 THEN 'T' ELSE 'F' END AS BAP,
    (SELECT COUNT(d.BILLING_DETAIL_ID) FROM n2n.D_BILLING_DOKUMEN d INNER JOIN n2n.D_DOKUMEN dd ON dd.DOKUMEN_ID = d.DOKUMEN_ID WHERE d.BILLING_ID = z.BILLING_ID AND dd.URL_DOKUMEN IS NOT NULL) AS TOTAL_DOKUMEN,
    E.LATEST_DATE_STATUS,
    E.KETERANGAN_REJECT,
    E.NAMA_DELIVERY,
    y.DETAIL_CHILD,
    E.SLA_KD_START                              AS "SLA0_START",
       E.SLA_KD_START                              AS "SLA0_END",
       E.SLA_SUBMIT_START                              AS "SLA1_START",
       E.SLA_INVOICE_START                              AS "SLA1_END",
       E.SLA_INVOICE_START                              AS "SLA2_START",
       E.SLA_PAID                                AS "SLA2_END",
       CASE 
            WHEN z.KD_STATUS IN ('303', '401') THEN
            1 
            ELSE 0
        END AS FLAG_FINANCE 
FROM ((SELECT DISTINCT a.*,
    b.PROJECT_NO, 
    b.NIP_SALES,
    b.NAMA_SALES,
    dpp.PID_PO,
    b.KD_SPUC,
    b.PROJECT_NO_OLD, 
    b.PROJECT_NAME, 
    b.CONTRACT_NO, 
	b.CONTRACT_DATE, 
    b.NILAI_KONTRAK, 
    mc.CUSTOMER_ID,
    mc.CUSTOMER_NAME,
    mc.ADDRESS,
    mc.COMP_CODE,
    mc.KOTA,
    dbr.NO_FAKTUR,
    dbr.NO_INVOICE,
    dbr.NOMINAL_DPP,
    dbr.PPN_TARIF AS TARIF_PPN,
    dbr.NOMINAL_INVOICE,
    TO_CHAR(dbr.TANGGAL_POSTING, 'DD-Mon-YYYY') AS TGL_INVOICE,
    TO_CHAR(rk.TGL_DOKUMEN, 'DD-Mon-YYYY') AS TGL_SURAT_TAGIHAN,
    TRUNC(SYSDATE - rk.TGL_DOKUMEN) AS AGING_PIUTANG,
    m.UR_REF UR_KATEGORI_PROJECT,
    CASE WHEN (SELECT COUNT(BILLING_ID) FROM D_BILLING WHERE PARENT_ID = a.BILLING_ID) > 0 THEN 1 ELSE 0 END AS FLAG_CHILD,
    hdr.IS_ACTIVE AS REQ_DOC,
    hdr.REQ_ID AS ID_REQ_DOC,
    hdr.CREATED_BY AS NIP_REQ_DOC 
    FROM n2n.D_BILLING a 
    LEFT JOIN D_PROJECT_PO dpp ON dpp.PROJECT_ID = a.PROJECT_ID AND dpp.PO_KODE = a.DIVISI_ID 
    INNER JOIN n2n.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID 
    AND b.KD_STATUS in ('005') AND b.PROJECT_TYPE_ID = 1 
    LEFT JOIN n2n.D_BILLING_REVENUE dbr ON a.BILLING_ID = dbr.BILLING_ID 
    LEFT JOIN n2n.R_KEUANGAN rk ON rk.SOURCE_ID = a.BILLING_ID AND rk.IS_CONDITION = 'A' AND rk.EVENT_CODE = 'SURAT TAGIHAN' 
    LEFT JOIN n2n.M_REFERENSI m ON m.KD_REF = b.PROJECT_KATEGORI_ID 
    AND m.JNS_REF = 'project_kategori_id' LEFT JOIN M_CUSTOMER mc ON mc.CUSTOMER_ID = b.CUSTOMER_ID LEFT JOIN (
        SELECT *
        FROM (
            SELECT hdr.*,
                ROW_NUMBER() OVER (
                    PARTITION BY hdr.TARGET_ID 
                    ORDER BY hdr.CREATED_AT DESC
                ) rn
            FROM H_DOC_REQ hdr
        )
        WHERE rn = 1
    ) hdr ON hdr.TARGET_ID = a.BILLING_CODE  
    WHERE (a.FLAG_PARENT IN (1,2) OR (a.FLAG_PARENT = 0 AND a.PARENT_ID IS NULL)) :status_billing)  
    --UNION ALL 
    --(SELECT DISTINCT a.*,
    --b.PROJECT_NO, 
    --b.PROJECT_NAME, 
    --b.NILAI_KONTRAK, 
    --m.UR_REF UR_KATEGORI_PROJECT 
    --FROM n2n.D_BILLING a 
    --INNER JOIN n2n.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID 
    --AND b.PROJECT_TYPE_ID = 2
    --AND b.PROJECT_ACTUAL_ID IS NOT NULL 
    --AND (SELECT KD_STATUS FROM D_PROJECT WHERE PROJECT_ID = b.PROJECT_ACTUAL_ID) IN ('005') LEFT JOIN n2n.M_REFERENSI m ON m.KD_REF = b.PROJECT_KATEGORI_ID AND m.JNS_REF = 'project_kategori_id')
    ) z LEFT JOIN (SELECT
        bl.PARENT_ID,
        JSON_ARRAYAGG(
            JSON_OBJECT('BILLING_ID' VALUE bl.BILLING_ID,
                        'BILLING_CODE' VALUE bl.BILLING_CODE,
                        'PROJECT_ID' VALUE bl.PROJECT_ID,
                        'TERMIN' VALUE bl.TERMIN,
                        'DESC_TERMIN' VALUE bl.DESC_TERMIN,
                        'KETERANGAN' VALUE bl.KETERANGAN,
                        'EST_BILLING' VALUE bl.EST_BILLING,
                        'EST_BULAN_BILLING' VALUE bl.EST_BULAN_BILLING,
                        'EST_PERIODE_BILLING' VALUE bl.EST_PERIODE_BILLING,
                        'REAL_BILLING' VALUE bl.REAL_BILLING,
                        'REAL_BULAN_BILLING' VALUE bl.REAL_BULAN_BILLING,
                        'REAL_PERIODE_BILLING' VALUE bl.REAL_PERIODE_BILLING,
                        'STATUS_BILLING' VALUE CASE 
                                                WHEN bl.KD_STATUS = '304' THEN
                                                    'Faktur Done' 
                                                WHEN bl.KD_STATUS = '303' THEN
                                                    'Req. Faktur' 
                                                WHEN bl.KD_STATUS = '302' THEN
                                                    'Rejected' 
                                                WHEN bl.KD_STATUS = '301' THEN
                                                    'Submitted' 
                                                WHEN bl.KD_STATUS = '400' THEN
                                                    'Invoice' 
                                                WHEN bl.KD_STATUS = '401' THEN
                                                    'Paid' 
                                                WHEN bl.KD_STATUS = '402' THEN
                                                    'PYMAD' 
                                                WHEN bl.KD_STATUS = '403' THEN
                                                    'Completed' 
                                                WHEN bl.KD_STATUS = '405' THEN
                                                    'Surat Tagihan' 
                                                ELSE '-'
                                            END)
                         RETURNING CLOB) DETAIL_CHILD
    FROM N2N.D_BILLING bl GROUP BY bl.PARENT_ID) y ON y.PARENT_ID = z.BILLING_ID LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = z.BILLING_ID LEFT JOIN SURAT_TAGIHAN ST ON ST.BILLING_ID = z.BILLING_ID AND ST.RN = 1 
    LEFT JOIN BAMK x ON x.PROJECT_ID = z.PROJECT_ID
    LEFT JOIN PERSENTASI_LAPORAN w ON w.PROJECT_ID = z.PROJECT_ID AND w.BILLING_ID = z.BILLING_ID
    WHERE (z.FLAG_PARENT IN (1, 2) OR (z.FLAG_PARENT = 0 AND z.PARENT_ID IS NULL)) :searchHeader :condition 
    :order OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`
// query.getListBillingCollections = `
// WITH LATEST_STATUS AS (SELECT PROJECT_ID,
//                               MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '400', '401', '402', '403', '405') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
//                               MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
//                               MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
//                               MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
//                               MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
//                               MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
//                               MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
//                               MAX(CASE
//                                       WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
//                                       ELSE CREATED_BY
//                                   END)                                                                      AS NAMA_DELIVERY
//                        FROM D_PROJECT_STATUS
//                        WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '405') 
//                        GROUP BY PROJECT_ID),
// SURAT_TAGIHAN AS (SELECT a.NO_DOKUMEN, a.TGL_DOKUMEN, a.URL_DOKUMEN, a.FLAG_DELETE, a.JSON_DOK, a.NOTES, a.NO_REF, b.BILLING_ID, ROW_NUMBER() OVER (PARTITION BY b.BILLING_ID ORDER BY a.CREATED_AT DESC) AS RN FROM D_DOKUMEN a INNER JOIN D_BILLING_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID WHERE a.JNS_DOKUMEN = '08001' ORDER BY a.CREATED_AT DESC) 
// SELECT 
//    ROW_NUMBER() OVER (:order) AS row_number,
//    z.BILLING_ID,
//    z.BILLING_CODE,
//    z.PROJECT_ID,
//    z.PID_PO,
//    z.KD_STATUS,
//    z.CREATED_AT,
//    z.CREATED_BY,
//    z.UPDATED_AT,
//    z.UPDATED_BY,
//    z.EST_BILLING,
//    z.EST_BULAN_BILLING,
//    z.EST_PERIODE_BILLING,
//    z.REAL_BILLING,
//    z.REAL_BULAN_BILLING,
//    z.REAL_PERIODE_BILLING,
//    z.TERMIN,
//    z.DESC_TERMIN,
//    z.KETERANGAN,
//    z.FLAG_PARENT,
//    z.PARENT_ID,
//    z.DIVISI_ID,
//    z.PROJECT_NO,
//    z.PROJECT_NO_OLD,
//    z.PROJECT_NAME,
//    z.NILAI_KONTRAK,
//    z.CUSTOMER_ID,
//    z.CUSTOMER_NAME,
//    z.NO_FAKTUR,
//    z.UR_KATEGORI_PROJECT,
//    z.FLAG_CHILD,
//    z.REQ_DOC,
//    z.ID_REQ_DOC,
//    z.NIP_REQ_DOC,
//    z.NO_INVOICE,
//    z.NOMINAL_DPP,
//    z.TARIF_PPN,
//    z.NOMINAL_INVOICE,
//    z.NIP_SALES,
//    ST.NO_REF,
//    ST.NO_DOKUMEN AS NO_SURAT_TAGIHAN,
//    CASE 
//     WHEN ST.URL_DOKUMEN IS NOT NULL AND SUBSTR(ST.URL_DOKUMEN, 1, 5) = 'https' 
//         THEN ST.URL_DOKUMEN 
//     WHEN ST.URL_DOKUMEN IS NOT NULL AND SUBSTR(ST.URL_DOKUMEN, 1, 5) != 'https'
//         THEN CONCAT('${LINK_DOK}', ST.URL_DOKUMEN) 
//     ELSE ST.URL_DOKUMEN 
//    END AS URL_SURAT_TAGIHAN,
//    ST.TGL_DOKUMEN AS TGL_SURAT_TAGIHAN,
//    ST.NOTES AS NOTE_SURAT_TAGIHAN,
//    ST.FLAG_DELETE AS VALID_SURAT_TAGIHAN,
//    TO_CHAR(z.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED,
//    CASE 
//         WHEN z.KD_STATUS = '304' THEN
//             'Faktur Done' 
//         WHEN z.KD_STATUS = '303' THEN
//             'Req. Faktur' 
//         WHEN z.KD_STATUS = '302' THEN
//             'Rejected' 
//         WHEN z.KD_STATUS = '301' THEN
//             'Sent' 
//         WHEN z.KD_STATUS = '400' THEN
//             'Invoice' 
//         WHEN z.KD_STATUS = '401' THEN
//             'Paid' 
//         WHEN z.KD_STATUS = '402' THEN
//             'PYMAD' 
//         WHEN z.KD_STATUS = '406' THEN
//             'Batal PYMAD' 
//         WHEN z.KD_STATUS = '403' THEN
//             'Completed' 
//         WHEN z.KD_STATUS = '405' THEN
//             'Surat Tagihan' 
//         ELSE '-'
//     END AS STATUS_BILLING,
//     CASE 
//         WHEN z.KD_STATUS = '300' THEN
//             'T'  
//         ELSE 'F' 
//     END AS STATUS_PYMAD,
//     (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = z.BILLING_ID AND x1.KD_STATUS = '300' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA_START",
//     (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = z.BILLING_ID AND x1.KD_STATUS = '301' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA_END",
//     CASE WHEN (SELECT COUNT(dbd.BILLING_DETAIL_ID) FROM n2n.D_BILLING_DOKUMEN dbd INNER JOIN n2n.D_DOKUMEN dd ON dd.DOKUMEN_ID = dbd.DOKUMEN_ID WHERE dbd.BILLING_ID = z.BILLING_ID AND dd.JNS_DOKUMEN = '04005' AND dd.URL_DOKUMEN IS NOT NULL) > 0 THEN 'T' ELSE 'F' END AS LAPORAN_PEKERJAAN,
//     CASE WHEN (SELECT COUNT(dbd.BILLING_DETAIL_ID) FROM n2n.D_BILLING_DOKUMEN dbd INNER JOIN n2n.D_DOKUMEN dd ON dd.DOKUMEN_ID = dbd.DOKUMEN_ID WHERE dbd.BILLING_ID = z.BILLING_ID AND dd.JNS_DOKUMEN = '04006' AND dd.URL_DOKUMEN IS NOT NULL) > 0 THEN 'T' ELSE 'F' END AS BAST,
//     CASE WHEN (SELECT COUNT(dbd.BILLING_DETAIL_ID) FROM n2n.D_BILLING_DOKUMEN dbd INNER JOIN n2n.D_DOKUMEN dd ON dd.DOKUMEN_ID = dbd.DOKUMEN_ID WHERE dbd.BILLING_ID = z.BILLING_ID AND dd.JNS_DOKUMEN = '04007' AND dd.URL_DOKUMEN IS NOT NULL) > 0 THEN 'T' ELSE 'F' END AS BAP,
//     (SELECT COUNT(d.BILLING_DETAIL_ID) FROM n2n.D_BILLING_DOKUMEN d INNER JOIN n2n.D_DOKUMEN dd ON dd.DOKUMEN_ID = d.DOKUMEN_ID WHERE d.BILLING_ID = z.BILLING_ID AND dd.URL_DOKUMEN IS NOT NULL) AS TOTAL_DOKUMEN,
//     E.LATEST_DATE_STATUS,
//     E.KETERANGAN_REJECT,
//     E.NAMA_DELIVERY,
//     y.DETAIL_CHILD,
//     E.SLA_KD_START                              AS "SLA0_START",
//        E.SLA_KD_START                              AS "SLA0_END",
//        E.SLA_SUBMIT_START                              AS "SLA1_START",
//        E.SLA_INVOICE_START                              AS "SLA1_END",
//        E.SLA_INVOICE_START                              AS "SLA2_START",
//        E.SLA_PAID                                AS "SLA2_END",
//        CASE 
//             WHEN z.KD_STATUS IN ('303', '401') THEN
//             1 
//             ELSE 0
//         END AS FLAG_FINANCE 
// FROM ((SELECT DISTINCT a.*,
//     b.PROJECT_NO, 
//     b.NIP_SALES,
//     dpp.PID_PO,
//     b.KD_SPUC,
//     b.PROJECT_NO_OLD, 
//     b.PROJECT_NAME, 
//     b.NILAI_KONTRAK, 
//     mc.CUSTOMER_ID,
//     mc.CUSTOMER_NAME,
//     dbr.NO_FAKTUR,
//     dbr.NO_INVOICE,
//     dbr.NOMINAL_DPP,
//     dbr.PPN_TARIF AS TARIF_PPN,
//     dbr.NOMINAL_INVOICE,
//     m.UR_REF UR_KATEGORI_PROJECT,
//     CASE WHEN (SELECT COUNT(BILLING_ID) FROM D_BILLING WHERE PARENT_ID = a.BILLING_ID) > 0 THEN 1 ELSE 0 END AS FLAG_CHILD,
//     hdr.IS_ACTIVE AS REQ_DOC,
//     hdr.REQ_ID AS ID_REQ_DOC,
//     hdr.CREATED_BY AS NIP_REQ_DOC 
//     FROM n2n.D_BILLING a 
//     LEFT JOIN D_PROJECT_PO dpp ON dpp.PROJECT_ID = a.PROJECT_ID AND dpp.PO_KODE = a.DIVISI_ID 
//     INNER JOIN n2n.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID 
//     AND b.KD_STATUS in ('005') AND b.PROJECT_TYPE_ID = 1 
//     LEFT JOIN n2n.D_BILLING_REVENUE dbr ON a.BILLING_ID = dbr.BILLING_ID 
//     LEFT JOIN n2n.M_REFERENSI m ON m.KD_REF = b.PROJECT_KATEGORI_ID 
//     AND m.JNS_REF = 'project_kategori_id' LEFT JOIN M_CUSTOMER mc ON mc.CUSTOMER_ID = b.CUSTOMER_ID LEFT JOIN (
//         SELECT *
//         FROM (
//             SELECT hdr.*,
//                 ROW_NUMBER() OVER (
//                     PARTITION BY hdr.TARGET_ID 
//                     ORDER BY hdr.CREATED_AT DESC
//                 ) rn
//             FROM H_DOC_REQ hdr
//         )
//         WHERE rn = 1
//     ) hdr ON hdr.TARGET_ID = a.BILLING_CODE  
//     WHERE a.FLAG_PARENT IN (1,2) :status_billing)  
//     --UNION ALL 
//     --(SELECT DISTINCT a.*,
//     --b.PROJECT_NO, 
//     --b.PROJECT_NAME, 
//     --b.NILAI_KONTRAK, 
//     --m.UR_REF UR_KATEGORI_PROJECT 
//     --FROM n2n.D_BILLING a 
//     --INNER JOIN n2n.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID 
//     --AND b.PROJECT_TYPE_ID = 2
//     --AND b.PROJECT_ACTUAL_ID IS NOT NULL 
//     --AND (SELECT KD_STATUS FROM D_PROJECT WHERE PROJECT_ID = b.PROJECT_ACTUAL_ID) IN ('005') LEFT JOIN n2n.M_REFERENSI m ON m.KD_REF = b.PROJECT_KATEGORI_ID AND m.JNS_REF = 'project_kategori_id')
//     ) z LEFT JOIN (SELECT
//         bl.PARENT_ID,
//         JSON_ARRAYAGG(
//             JSON_OBJECT('BILLING_ID' VALUE bl.BILLING_ID,
//                         'BILLING_CODE' VALUE bl.BILLING_CODE,
//                         'PROJECT_ID' VALUE bl.PROJECT_ID,
//                         'TERMIN' VALUE bl.TERMIN,
//                         'DESC_TERMIN' VALUE bl.DESC_TERMIN,
//                         'KETERANGAN' VALUE bl.KETERANGAN,
//                         'EST_BILLING' VALUE bl.EST_BILLING,
//                         'EST_BULAN_BILLING' VALUE bl.EST_BULAN_BILLING,
//                         'EST_PERIODE_BILLING' VALUE bl.EST_PERIODE_BILLING,
//                         'REAL_BILLING' VALUE bl.REAL_BILLING,
//                         'REAL_BULAN_BILLING' VALUE bl.REAL_BULAN_BILLING,
//                         'REAL_PERIODE_BILLING' VALUE bl.REAL_PERIODE_BILLING,
//                         'STATUS_BILLING' VALUE CASE 
//                                                 WHEN bl.KD_STATUS = '304' THEN
//                                                     'Faktur Done' 
//                                                 WHEN bl.KD_STATUS = '303' THEN
//                                                     'Req. Faktur' 
//                                                 WHEN bl.KD_STATUS = '302' THEN
//                                                     'Rejected' 
//                                                 WHEN bl.KD_STATUS = '301' THEN
//                                                     'Submitted' 
//                                                 WHEN bl.KD_STATUS = '400' THEN
//                                                     'Invoice' 
//                                                 WHEN bl.KD_STATUS = '401' THEN
//                                                     'Paid' 
//                                                 WHEN bl.KD_STATUS = '402' THEN
//                                                     'PYMAD' 
//                                                 WHEN bl.KD_STATUS = '403' THEN
//                                                     'Completed' 
//                                                 WHEN bl.KD_STATUS = '405' THEN
//                                                     'Surat Tagihan' 
//                                                 ELSE '-'
//                                             END)
//                          RETURNING CLOB) DETAIL_CHILD
//     FROM N2N.D_BILLING bl GROUP BY bl.PARENT_ID) y ON y.PARENT_ID = z.BILLING_ID LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = z.BILLING_ID LEFT JOIN SURAT_TAGIHAN ST ON ST.BILLING_ID = z.BILLING_ID AND ST.RN = 1 WHERE z.FLAG_PARENT IN (1, 2) :searchHeader :condition 
//     :order OFFSET (:page - 1) * :limit ROWS -- Calculate offset
// FETCH NEXT :limit ROWS ONLY;`
// query.getListBillingCollections = `
// WITH LATEST_STATUS AS (
//     SELECT 
//         PROJECT_ID,
//         MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '400', '401', '402', '403') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
//         MAX(CASE WHEN KD_STATUS = '402' THEN TO_CHAR(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_KD_START,
//         MAX(CASE WHEN KD_STATUS = '403' THEN TO_CHAR(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_KD_END,
//         MAX(CASE WHEN KD_STATUS = '301' THEN TO_CHAR(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_SUBMIT_START,
//         MAX(CASE WHEN KD_STATUS = '400' THEN TO_CHAR(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_INVOICE_START,
//         MAX(CASE WHEN KD_STATUS = '401' THEN TO_CHAR(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_PAID,
//         MAX(CASE 
//                 WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
//                 ELSE CREATED_BY
//             END) AS NAMA_DELIVERY
//     FROM D_PROJECT_STATUS
//     WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403')
//     GROUP BY PROJECT_ID
// ),
// DOCUMENT_COUNTS AS (
//     SELECT 
//         dbd.BILLING_ID,
//         COUNT(CASE WHEN dd.JNS_DOKUMEN = '04005' AND dd.URL_DOKUMEN IS NOT NULL THEN 1 END) AS LAPORAN_PEKERJAAN_CNT,
//         COUNT(CASE WHEN dd.JNS_DOKUMEN = '04006' AND dd.URL_DOKUMEN IS NOT NULL THEN 1 END) AS BAST_CNT,
//         COUNT(CASE WHEN dd.JNS_DOKUMEN = '04007' AND dd.URL_DOKUMEN IS NOT NULL THEN 1 END) AS BAP_CNT,
//         COUNT(CASE WHEN dd.URL_DOKUMEN IS NOT NULL THEN 1 END) AS TOTAL_DOKUMEN
//     FROM n2n.D_BILLING_DOKUMEN dbd
//     INNER JOIN n2n.D_DOKUMEN dd ON dd.DOKUMEN_ID = dbd.DOKUMEN_ID
//     GROUP BY dbd.BILLING_ID
// ),
// SLA_DATES AS (
//     SELECT 
//         PROJECT_ID,
//         MAX(CASE WHEN KD_STATUS = '300' THEN TO_CHAR(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_START,
//         MAX(CASE WHEN KD_STATUS = '301' THEN TO_CHAR(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_END
//     FROM D_PROJECT_STATUS
//     WHERE KD_STATUS IN ('300', '301')
//     GROUP BY PROJECT_ID
// )
// SELECT 
//     ROW_NUMBER() OVER (:order) AS row_number,
//     z.*,
//     TO_CHAR(z.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED,
//     CASE 
//         WHEN z.KD_STATUS = '304' THEN 'Faktur Done'
//         WHEN z.KD_STATUS = '303' THEN 'Req. Faktur'
//         WHEN z.KD_STATUS = '302' THEN 'Rejected'
//         WHEN z.KD_STATUS = '301' THEN 'Sent'
//         WHEN z.KD_STATUS = '400' THEN 'Invoice'
//         WHEN z.KD_STATUS = '401' THEN 'Paid'
//         WHEN z.KD_STATUS = '402' THEN 'PYMAD'
//         WHEN z.KD_STATUS = '403' THEN 'Completed'
//         ELSE '-'
//     END AS STATUS_BILLING,
//     CASE 
//         WHEN z.KD_STATUS = '300' THEN 'T'
//         ELSE 'F'
//     END AS STATUS_PYMAD,
//     sd.SLA_START,
//     sd.SLA_END,
//     CASE WHEN dc.LAPORAN_PEKERJAAN_CNT > 0 THEN 'T' ELSE 'F' END AS LAPORAN_PEKERJAAN,
//     CASE WHEN dc.BAST_CNT > 0 THEN 'T' ELSE 'F' END AS BAST,
//     CASE WHEN dc.BAP_CNT > 0 THEN 'T' ELSE 'F' END AS BAP,
//     dc.TOTAL_DOKUMEN,
//     ls.LATEST_DATE_STATUS,
//     ls.NAMA_DELIVERY,
//     y.DETAIL_CHILD,
//     ls.SLA_KD_START AS SLA0_START,
//     ls.SLA_KD_START AS SLA0_END,
//     ls.SLA_SUBMIT_START AS SLA1_START,
//     ls.SLA_INVOICE_START AS SLA1_END,
//     ls.SLA_INVOICE_START AS SLA2_START,
//     ls.SLA_PAID AS SLA2_END,
//     CASE 
//         WHEN z.KD_STATUS IN ('301', '303', '400', '401', '403') THEN 1
//         ELSE 0
//     END AS FLAG_FINANCE
// FROM (
//     SELECT DISTINCT 
//         a.*,
//         b.PROJECT_NO,
//         b.PROJECT_NO_OLD,
//         b.PROJECT_NAME,
//         b.NILAI_KONTRAK,
//         mc.CUSTOMER_ID,
//         mc.CUSTOMER_NAME,
//         dbr.NO_FAKTUR,
//         m.UR_REF AS UR_KATEGORI_PROJECT,
//         CASE WHEN EXISTS (SELECT 1 FROM n2n.D_BILLING WHERE PARENT_ID = a.BILLING_ID) THEN 1 ELSE 0 END AS FLAG_CHILD
//     FROM n2n.D_BILLING a
//     INNER JOIN n2n.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID
//     LEFT JOIN n2n.D_BILLING_REVENUE dbr ON a.BILLING_ID = dbr.BILLING_ID
//     LEFT JOIN n2n.M_REFERENSI m ON m.KD_REF = b.PROJECT_KATEGORI_ID AND m.JNS_REF = 'project_kategori_id'
//     LEFT JOIN n2n.M_CUSTOMER mc ON mc.CUSTOMER_ID = b.CUSTOMER_ID
//     WHERE a.FLAG_PARENT = 1
//         AND b.KD_STATUS = '005'
//         AND b.PROJECT_TYPE_ID = 1
//         :status_billing
// ) z
// LEFT JOIN (
//     SELECT 
//         PARENT_ID,
//         JSON_ARRAYAGG(
//             JSON_OBJECT(
//                 'BILLING_ID' VALUE bl.BILLING_ID,
//                 'PROJECT_ID' VALUE bl.PROJECT_ID,
//                 'TERMIN' VALUE bl.TERMIN,
//                 'DESC_TERMIN' VALUE bl.DESC_TERMIN,
//                 'KETERANGAN' VALUE bl.KETERANGAN,
//                 'EST_BILLING' VALUE bl.EST_BILLING,
//                 'EST_BULAN_BILLING' VALUE bl.EST_BULAN_BILLING,
//                 'EST_PERIODE_BILLING' VALUE bl.EST_PERIODE_BILLING,
//                 'REAL_BILLING' VALUE bl.REAL_BILLING,
//                 'REAL_BULAN_BILLING' VALUE bl.REAL_BULAN_BILLING,
//                 'REAL_PERIODE_BILLING' VALUE bl.REAL_PERIODE_BILLING,
//                 'STATUS_BILLING' VALUE CASE 
//                     WHEN bl.KD_STATUS = '304' THEN 'Faktur Done'
//                     WHEN bl.KD_STATUS = '303' THEN 'Req. Faktur'
//                     WHEN bl.KD_STATUS = '302' THEN 'Rejected'
//                     WHEN bl.KD_STATUS = '301' THEN 'Submitted'
//                     WHEN bl.KD_STATUS = '400' THEN 'Invoice'
//                     WHEN bl.KD_STATUS = '401' THEN 'Paid'
//                     WHEN bl.KD_STATUS = '402' THEN 'PYMAD'
//                     WHEN bl.KD_STATUS = '403' THEN 'Completed'
//                     ELSE '-'
//                 END
//             ) RETURNING CLOB
//         ) AS DETAIL_CHILD
//     FROM n2n.D_BILLING bl
//     GROUP BY PARENT_ID
// ) y ON y.PARENT_ID = z.BILLING_ID
// LEFT JOIN LATEST_STATUS ls ON ls.PROJECT_ID = z.BILLING_ID
// LEFT JOIN DOCUMENT_COUNTS dc ON dc.BILLING_ID = z.BILLING_ID
// LEFT JOIN SLA_DATES sd ON sd.PROJECT_ID = z.BILLING_ID
// WHERE z.FLAG_PARENT = 1
//     :condition
// :order
// OFFSET (:page - 1) * :limit ROWS
// FETCH NEXT :limit ROWS ONLY;
// `

//untuk union ke billing project vendor
// UNION ALL 
//     (SELECT a.*, c.PROJECT_NO, c.PROJECT_NAME, m.UR_REF UR_KATEGORI_PROJECT FROM n2n.D_BILLING a INNER JOIN n2n.D_PROJECT_VENDOR b ON b.PROJECT_ID = a.PROJECT_ID LEFT JOIN n2n.D_PROJECT c ON c.PROJECT_ID = b.PROJECT_ID LEFT JOIN n2n.M_REFERENSI m ON m.KD_REF = c.PROJECT_KATEGORI_ID AND m.JNS_REF = 'project_kategori_id'

query.countListBillingCollections = `
WITH LATEST_STATUS AS (SELECT PROJECT_ID,
                              MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '400', '401', '402', '403') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
                              MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
                              MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
                              MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
                              MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
                              MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
                              MAX(CASE
                                      WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
                                      ELSE CREATED_BY
                                  END)                                                                      AS NAMA_DELIVERY
                       FROM D_PROJECT_STATUS
                       WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403') 
                       GROUP BY PROJECT_ID)
SELECT 
   COUNT(z.BILLING_ID) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit" 
FROM ((SELECT DISTINCT a.*, 
    b.PROJECT_NO,
    b.NIP_SALES, 
    b.PROJECT_NO_OLD, 
    b.PROJECT_NAME, 
    b.NILAI_KONTRAK, 
    mc.CUSTOMER_ID,
    mc.CUSTOMER_NAME,
    dbr.NO_FAKTUR,
    dbr.NO_INVOICE,
    m.UR_REF UR_KATEGORI_PROJECT,
    CASE WHEN (SELECT COUNT(*) FROM D_BILLING WHERE PARENT_ID = a.BILLING_ID) > 0 THEN 1 ELSE 0 END AS FLAG_CHILD 
    FROM n2n.D_BILLING a 
    INNER JOIN n2n.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID 
    AND b.KD_STATUS in ('005') AND b.PROJECT_TYPE_ID = 1 
    LEFT JOIN n2n.D_BILLING_REVENUE dbr ON a.BILLING_ID = dbr.BILLING_ID 
    LEFT JOIN n2n.M_REFERENSI m ON m.KD_REF = b.PROJECT_KATEGORI_ID 
    AND m.JNS_REF = 'project_kategori_id' LEFT JOIN M_CUSTOMER mc ON mc.CUSTOMER_ID = b.CUSTOMER_ID 
    WHERE a.FLAG_PARENT IN (1, 2) AND a.KATEGORI_BILLING = 1 :status_billing)  
    --UNION ALL 
    --(SELECT DISTINCT a.*,
    --b.PROJECT_NO, 
    --b.PROJECT_NAME, 
    --b.NILAI_KONTRAK, 
    --m.UR_REF UR_KATEGORI_PROJECT 
    --FROM n2n.D_BILLING a 
    --INNER JOIN n2n.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID 
    --AND b.PROJECT_TYPE_ID = 2
    --AND b.PROJECT_ACTUAL_ID IS NOT NULL 
    --AND (SELECT KD_STATUS FROM D_PROJECT WHERE PROJECT_ID = b.PROJECT_ACTUAL_ID) IN ('005') LEFT JOIN n2n.M_REFERENSI m ON m.KD_REF = b.PROJECT_KATEGORI_ID AND m.JNS_REF = 'project_kategori_id')
    ) z LEFT JOIN (SELECT
        bl.PARENT_ID,
        JSON_ARRAYAGG(
            JSON_OBJECT('BILLING_ID' VALUE bl.BILLING_ID,
                        'PROJECT_ID' VALUE bl.PROJECT_ID,
                        'TERMIN' VALUE bl.TERMIN,
                        'DESC_TERMIN' VALUE bl.DESC_TERMIN,
                        'KETERANGAN' VALUE bl.KETERANGAN,
                        'EST_BILLING' VALUE bl.EST_BILLING,
                        'EST_BULAN_BILLING' VALUE bl.EST_BULAN_BILLING,
                        'EST_PERIODE_BILLING' VALUE bl.EST_PERIODE_BILLING,
                        'REAL_BILLING' VALUE bl.REAL_BILLING,
                        'REAL_BULAN_BILLING' VALUE bl.REAL_BULAN_BILLING,
                        'REAL_PERIODE_BILLING' VALUE bl.REAL_PERIODE_BILLING,
                        'STATUS_BILLING' VALUE CASE 
                                                WHEN bl.KD_STATUS = '304' THEN
                                                    'Faktur Done' 
                                                WHEN bl.KD_STATUS = '303' THEN
                                                    'Req. Faktur' 
                                                WHEN bl.KD_STATUS = '302' THEN
                                                    'Rejected' 
                                                WHEN bl.KD_STATUS = '301' THEN
                                                    'Submitted' 
                                                WHEN bl.KD_STATUS = '400' THEN
                                                    'Invoice' 
                                                WHEN bl.KD_STATUS = '401' THEN
                                                    'Paid' 
                                                WHEN bl.KD_STATUS = '402' THEN
                                                    'PYMAD' 
                                                WHEN bl.KD_STATUS = '403' THEN
                                                    'Completed' 
                                                ELSE '-'
                                            END)
                         RETURNING CLOB) DETAIL_CHILD
    FROM N2N.D_BILLING bl GROUP BY bl.PARENT_ID) y ON y.PARENT_ID = z.BILLING_ID 
    LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = z.BILLING_ID WHERE z.FLAG_PARENT IN (1,2) :searchHeader :condition`;
// query.countListBillingCollections = `
// WITH LATEST_STATUS AS (
//     SELECT 
//         PROJECT_ID,
//         MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '400', '401', '402', '403') THEN DATE_STATUS END) AS LATEST_DATE_STATUS
//     FROM D_PROJECT_STATUS
//     WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403')
//     GROUP BY PROJECT_ID
// )
// SELECT 
//     COUNT(z.BILLING_ID) AS "total_data",
//     :page AS "total_halaman",
//     :limit AS "limit"
// FROM n2n.D_BILLING z
// INNER JOIN n2n.D_PROJECT b ON b.PROJECT_ID = z.PROJECT_ID
//     AND b.KD_STATUS = '005'
//     AND b.PROJECT_TYPE_ID = 1
// LEFT JOIN n2n.M_REFERENSI m ON m.KD_REF = b.PROJECT_KATEGORI_ID 
//     AND m.JNS_REF = 'project_kategori_id'
// LEFT JOIN n2n.M_CUSTOMER mc ON mc.CUSTOMER_ID = b.CUSTOMER_ID
// LEFT JOIN LATEST_STATUS ls ON ls.PROJECT_ID = z.BILLING_ID
// WHERE z.FLAG_PARENT = 1 :status_billing :condition;
// `;

query.countListProject = `SELECT
   count(a.PROJECT_ID) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit" 
FROM n2n.D_PROJECT a 
LEFT JOIN n2n.M_REFERENSI b ON b.KD_REF = a.PROJECT_KATEGORI_ID AND b.JNS_REF = lower('PROJECT_KATEGORI_ID')
LEFT JOIN n2n.M_REFERENSI c ON c.KD_REF = a.PROJECT_TYPE_ID AND c.JNS_REF = lower('PROJECT_TYPE_ID')
LEFT JOIN n2n.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = TO_NUMBER(a.PORTOFOLIO_ID)
LEFT JOIN n2n.M_REFERENSI e ON e.KD_REF = a.CATEGORY_ID AND e.JNS_REF = lower('CATEGORY_ID')
LEFT JOIN n2n.M_CUSTOMER f ON f.CUSTOMER_ID = a.CUSTOMER_ID AND f.FLAG_AKTIF = 'Y'
LEFT JOIN n2n.M_REFERENSI g ON g.KD_REF = a.KD_AREA AND g.JNS_REF = lower('KD_AREA')
LEFT JOIN n2n.M_STATUS h ON h.KD_STATUS = a.KD_STATUS AND h.ID_TAB_STATUS = 'SA1' 
LEFT JOIN n2n.V_SLA v1 ON v1.PROJECT_ID = a.PROJECT_ID :cond_billing  
:condition 
AND (a.PROJECT_NO like :keyword
    OR upper(a.PROJECT_NAME) like upper(:keyword)
    OR upper(d.PORTOFOLIO) like upper(:keyword)
    OR upper(c.UR_REF) like upper(:keyword)
    OR upper(f.CUSTOMER_NAME) like upper(:keyword)
    OR a.CONTRACT_NO like :keyword
    OR upper(h.URAIAN) like upper(:keyword))`;

query.countListBillingRealization = `SELECT
   count(a.PROJECT_ID) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit"
FROM ((SELECT 
   a.*,
   b.UR_REF as "PROJECT_KATEGORI_UR",
   c.UR_REF as "PROJECT_TYPE_UR",
   d.PORTOFOLIO as "PORTOFOLIO_UR",
   e.UR_REF as "CATEGORY_UR",
   f.CUSTOMER_NAME,
   g.UR_REF as "UR_AREA",
   h.URAIAN as "UR_STATUS",
   CASE 
        WHEN (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS = '302') > 0 THEN
            'Rejected' 
        WHEN (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS IN ('301','400','401','402')) > 0 AND (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS = '302') = 0 THEN
            'Sent' 
        ELSE '-'
    END AS STATUS_BILLING 
FROM n2n.D_PROJECT a 
INNER JOIN (SELECT PROJECT_ID FROM N2N.D_BILLING GROUP BY PROJECT_ID) i ON i.PROJECT_ID = a.PROJECT_ID 
LEFT JOIN n2n.M_REFERENSI b ON b.KD_REF = a.PROJECT_KATEGORI_ID AND b.JNS_REF = lower('PROJECT_KATEGORI_ID')
LEFT JOIN n2n.M_REFERENSI c ON c.KD_REF = a.PROJECT_TYPE_ID AND c.JNS_REF = lower('PROJECT_TYPE_ID')
LEFT JOIN n2n.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = TO_NUMBER(a.PORTOFOLIO_ID)
LEFT JOIN n2n.M_REFERENSI e ON e.KD_REF = a.CATEGORY_ID AND e.JNS_REF = lower('CATEGORY_ID')
LEFT JOIN n2n.M_CUSTOMER f ON f.CUSTOMER_ID = a.CUSTOMER_ID AND f.FLAG_AKTIF = 'Y'
LEFT JOIN n2n.M_REFERENSI g ON g.KD_REF = a.KD_AREA AND g.JNS_REF = lower('KD_AREA')
LEFT JOIN n2n.M_STATUS h ON h.KD_STATUS = a.KD_STATUS AND h.ID_TAB_STATUS = 'SA1' 
WHERE a.PROJECT_TYPE_ID = 1 AND a.KD_STATUS = '005' :condition1)  
UNION ALL 
(SELECT 
   a.*,
   b.UR_REF as "PROJECT_KATEGORI_UR",
   c.UR_REF as "PROJECT_TYPE_UR",
   d.PORTOFOLIO as "PORTOFOLIO_UR",
   e.UR_REF as "CATEGORY_UR",
   f.CUSTOMER_NAME,
   g.UR_REF as "UR_AREA",
   h.URAIAN as "UR_STATUS",
   CASE 
        WHEN (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS = '302') > 0 THEN
            'Rejected' 
        WHEN (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS IN ('301','400','401','402')) > 0 AND (SELECT COUNT(*) FROM D_BILLING a1 WHERE a1.PROJECT_ID = a.PROJECT_ID AND a1.KD_STATUS = '302') = 0 THEN
            'Sent' 
        ELSE '-'
    END AS STATUS_BILLING 
FROM n2n.D_PROJECT a 
INNER JOIN (SELECT PROJECT_ID FROM N2N.D_BILLING GROUP BY PROJECT_ID) i ON i.PROJECT_ID = a.PROJECT_ID 
LEFT JOIN n2n.M_REFERENSI b ON b.KD_REF = a.PROJECT_KATEGORI_ID AND b.JNS_REF = lower('PROJECT_KATEGORI_ID')
LEFT JOIN n2n.M_REFERENSI c ON c.KD_REF = a.PROJECT_TYPE_ID AND c.JNS_REF = lower('PROJECT_TYPE_ID')
LEFT JOIN n2n.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = TO_NUMBER(a.PORTOFOLIO_ID)
LEFT JOIN n2n.M_REFERENSI e ON e.KD_REF = a.CATEGORY_ID AND e.JNS_REF = lower('CATEGORY_ID')
LEFT JOIN n2n.M_CUSTOMER f ON f.CUSTOMER_ID = a.CUSTOMER_ID AND f.FLAG_AKTIF = 'Y'
LEFT JOIN n2n.M_REFERENSI g ON g.KD_REF = a.KD_AREA AND g.JNS_REF = lower('KD_AREA')
LEFT JOIN n2n.M_STATUS h ON h.KD_STATUS = a.KD_STATUS AND h.ID_TAB_STATUS = 'SA1' 
WHERE a.PROJECT_TYPE_ID = 2 AND a.PROJECT_ACTUAL_ID IS NOT NULL AND 
    (SELECT x.KD_STATUS FROM D_PROJECT x WHERE x.PROJECT_ID = a.PROJECT_ACTUAL_ID) = '005' 
    :condition1)) a 
WHERE
    (a.PROJECT_NO like :keyword
    OR upper(a.PROJECT_NAME) like upper(:keyword)
    OR upper(a.PORTOFOLIO_UR) like upper(:keyword)
    OR upper(a.PROJECT_TYPE_UR) like upper(:keyword)
    OR upper(a.CUSTOMER_NAME) like upper(:keyword)
    OR upper(a.CONTRACT_NO) like upper(:keyword) 
    OR upper(a.UR_STATUS) like upper(:keyword))`;

query.getListProjectForCostPersonil = `SELECT
   ROW_NUMBER() OVER (:order) AS row_number,
   a.PROJECT_ID, 
   a.PROJECT_NO, 
   a.PROJECT_NAME, 
   a.NILAI_KONTRAK,
   a.KD_SPUC,
   m1.PORTOFOLIO as "PORTOFOLIO_UR", 
   m2.UR_REF as "PROJECT_TYPE_UR",
   (select sum(b.COST_TOTAL) from n2n.D_PERSONIL b where b.PROJECT_ID = a.PROJECT_ID) TOTAL_COST 
FROM n2n.D_PROJECT a 
    LEFT JOIN n2n.M_PORTOFOLIO m1 ON m1.PORTOFOLIO_ID = a.PORTOFOLIO_ID 
    LEFT JOIN n2n.M_REFERENSI m2 ON m2.KD_REF = a.PROJECT_TYPE_ID AND m2.JNS_REF = lower('PROJECT_TYPE_ID') 
:condition 
:order
OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`

query.getProjectForCostPersonil = `SELECT
   a.*,
   b.UR_REF as "PROJECT_KATEGORI_UR",
   c.UR_REF as "PROJECT_TYPE_UR",
   d.PORTOFOLIO as "PORTOFOLIO_UR", 
   e.UR_REF as "CATEGORY_UR",
   f.CUSTOMER_NAME,
   (select sum(b.COST_TOTAL) from n2n.D_PERSONIL b where b.PROJECT_ID = a.PROJECT_ID) TOTAL_COST 
FROM n2n.D_PROJECT a 
LEFT JOIN n2n.M_REFERENSI b ON b.KD_REF = a.PROJECT_KATEGORI_ID AND b.JNS_REF = lower('PROJECT_KATEGORI_ID')
LEFT JOIN n2n.M_REFERENSI c ON c.KD_REF = a.PROJECT_TYPE_ID AND c.JNS_REF = lower('PROJECT_TYPE_ID') 
LEFT JOIN n2n.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = TO_NUMBER(a.PORTOFOLIO_ID) 
LEFT JOIN n2n.M_REFERENSI e ON e.KD_REF = a.CATEGORY_ID AND e.JNS_REF = lower('CATEGORY_ID') 
LEFT JOIN n2n.M_CUSTOMER f ON f.CUSTOMER_ID = a.CUSTOMER_ID AND f.FLAG_AKTIF = 'Y' 
WHERE a.PROJECT_ID = :project_id`

query.getProjectForCostOperasional = `SELECT
   a.PROJECT_ID, 
   a.PROJECT_NO, 
   a.PROJECT_NAME, 
   a.NILAI_KONTRAK, 
   (select sum(b.NILAI_COST) from n2n.D_COST_OPR b where b.PROJECT_ID = a.PROJECT_ID) TOTAL_COST 
FROM n2n.D_PROJECT a WHERE a.PROJECT_ID = :project_id`

query.countListProjectForCostPersonil = `SELECT
   count(a.PROJECT_ID) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit" 
FROM n2n.D_PROJECT a  
:condition`;

query.getDetailCostPersonil = `SELECT 
    ROW_NUMBER() OVER (ORDER BY b.POSITION_ID ASC) AS row_number,
    b.*,
   -- c.PERSONEL_ID, 
   -- c.USER_ID, 
   -- c.NIK, 
   -- c.NAMA_PERSONIL, 
   m1.UR_REF POSITION,
   m2.UR_REF KUALIFIKASI,
   -- c.DIVISI_ID,
   -- m3.UR_REF DIVISI,
   m4.UR_REF UR_SATUAN_PERSON, 
   m5.UR_REF UR_SATUAN_DATE  
FROM 
    n2n.D_PERSONIL b 
    -- left join n2n.D_PERSONIL_DETAIL c on b.PERSONEL_ID = c.PERSONEL_ID 
    left join M_REFERENSI m1 on m1.KD_REF = b.position_id and m1.JNS_REF = lower('POSITION_ID') 
    left join M_REFERENSI m2 on m2.KD_REF = b.kualifikasi_id and m2.JNS_REF = lower('KUALIFIKASI_ID') 
    -- left join M_REFERENSI m3 on m3.KD_REF = c.divisi_id and m3.JNS_REF = lower('DIVISI_ID') 
    left join M_REFERENSI m4 on m4.KD_REF = b.satuan_person and m4.JNS_REF = lower('SATUAN_PERSON') 
    left join M_REFERENSI m5 on m5.KD_REF = b.satuan_person and m5.JNS_REF = lower('SATUAN_DATE') 
WHERE 
    b.PROJECT_ID = :project_id 
ORDER BY b.POSITION_ID ASC`

query.getDetailCostPersonilDetail = `SELECT 
    ROW_NUMBER() OVER (ORDER BY b.NAMA_PERSONIL ASC) AS row_number,
    b.DPERSONEL_ID,
    b.SUB_DPERSONEL_ID,
    b.USER_ID,
    b.NIK,
    b.NAMA_PERSONIL,
    b.DIVISI_ID,
    b.QTY_DATE,
    b.SATUAN_DATE,
    b.FLAG_PERSONIL,
    m3.UR_REF divisi,
    m4.UR_REF satuan,
    m5.UR_REF nama_role
FROM 
    n2n.D_PERSONIL_DETAIL b 
    left join M_REFERENSI m3 on m3.KD_REF = b.divisi_id and m3.JNS_REF = lower('DIVISI_ID') 
    left join M_REFERENSI m4 on m4.KD_REF = b.satuan_date and m4.JNS_REF = lower('SATUAN_DATE') 
    left join D_PERSONIL dp ON dp.PERSONEL_ID = b.PERSONEL_ID
    left join M_REFERENSI m5 on m5.KD_REF = dp.POSITION_ID and m5.JNS_REF = lower('POSITION_ID')
WHERE 
    b.PERSONEL_ID = :personel_id 
ORDER BY b.NAMA_PERSONIL ASC`

query.getDetailCostOperasional = `SELECT 
    ROW_NUMBER() OVER (ORDER BY b.COST_ID ASC) AS row_number,
   b.*, 
   m3.UR_REF DIVISI 
FROM 
    n2n.D_COST_OPR b left join M_REFERENSI m3 on m3.KD_REF = b.divisi_id and m3.JNS_REF = lower('DIVISI_ID') 
WHERE 
    b.PROJECT_ID = :project_id 
ORDER BY b.COST_ID ASC`

query.getDetailCostOperasionalWithDokumenByCostId = `SELECT
   a.*,
   b.PROJECT_NO, 
   b.PROJECT_NAME, 
   b.NILAI_KONTRAK  
FROM n2n.D_COST_OPR a left join n2n.D_PROJECT b on a.PROJECT_ID = b.PROJECT_ID WHERE a.COST_ID = :cost_id`

query.getDetailDokumenCostOperasional = `SELECT 
	c.COST_DETAIL_ID,
    a.DOKUMEN_ID,
	a.TIPE_DOKUMEN ,
	a.JNS_DOKUMEN,
	b.UR_REF AS "URAIAN_JENIS",
	a.NO_DOKUMEN,
	TO_CHAR(a.TGL_DOKUMEN, 'DD/MM/YYYY') AS "TGL_DOKUMEN",
	CASE 
		WHEN a.URL_DOKUMEN IS NOT NULL THEN CONCAT('${LINK_DOK}', a.URL_DOKUMEN)
		ELSE a.URL_DOKUMEN
	END URL_DOKUMEN,
	a.NOTES,
	a.VALUE_DOK 
FROM
	N2N.D_COST_OPR_DETAIL c LEFT JOIN N2N.D_DOKUMEN a ON c.DOKUMEN_ID = a.DOKUMEN_ID 
    LEFT JOIN N2N.M_REFERENSI b ON b.KD_REF = a.JNS_DOKUMEN 
WHERE 
	c.COST_ID = :cost_id`

query.getListProjectForCostOperasional = `
SELECT
   ROW_NUMBER() OVER (:order) AS row_number,
   a.PROJECT_ID, 
   a.PROJECT_NO, 
   a.PROJECT_NAME, 
   a.NILAI_KONTRAK, 
   m1.PORTOFOLIO as "PORTOFOLIO_UR", 
   m2.UR_REF as "PROJECT_TYPE_UR",
   (select sum(b.NILAI_COST) from n2n.D_COST_OPR b where b.PROJECT_ID = a.PROJECT_ID) TOTAL_COST 
FROM n2n.D_PROJECT a 
    LEFT JOIN n2n.M_PORTOFOLIO m1 ON m1.PORTOFOLIO_ID = a.PORTOFOLIO_ID 
    LEFT JOIN n2n.M_REFERENSI m2 ON m2.KD_REF = a.PROJECT_TYPE_ID AND m2.JNS_REF = lower('PROJECT_TYPE_ID') 
:condition 
:order
OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`

query.countListProjectForCostOperasional = `SELECT
   count(a.PROJECT_ID) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit" 
FROM n2n.D_PROJECT a 
:condition`;

query.getVendorProjectBilling = `SELECT
   c.PROJECT_ID, 
   a.BILLING_ID, 
   c.PROJECT_NO, 
   c.PROJECT_NAME, 
   b.NILAI_KONTRAK,
   b.NO_KONTRAK,
   b.VENDOR_ID, 
   m.NAMA_PERUSAHAAN NAMA_VENDOR,
   a.TERMIN, 
   a.DIVISI_ID, 
   a.EST_PERIODE_BILLING, 
   a.EST_BULAN_BILLING, 
   a.EST_BILLING, 
   a.REAL_PERIODE_BILLING, 
   a.REAL_BULAN_BILLING, 
   a.REAL_BILLING,  
   a.KD_STATUS, 
   ms.URAIAN URAIAN_STATUS, 
   a.CREATED_BY 
FROM n2n.D_BILLING a
JOIN n2n.D_PROJECT_VENDOR b ON
	b.PROJECT_VENDOR_ID = a.PROJECT_ID
LEFT JOIN n2n.D_PROJECT c ON
	b.PROJECT_ID = c.PROJECT_ID 
LEFT JOIN n2n.M_VENDOR_PT m ON 
    m.VENDOR_ID = b.VENDOR_ID 
LEFT join n2n.M_STATUS ms on a.KD_STATUS = ms.KD_STATUS WHERE 
a.BILLING_ID = :billing_id;`

query.getDokumenInvoice = `SELECT 
   a.BILLING_DETAIL_ID, 
   a.BILLING_ID,
   b.DOKUMEN_ID,
   b.TIPE_DOKUMEN,
   b.JNS_DOKUMEN,
   b.NO_DOKUMEN,
   TO_CHAR(b.TGL_DOKUMEN, 'DD/MM/YYYY') AS "TGL_DOKUMEN",
   b.NOTES,
   b.VALUE_DOK,
   b.PROJECT_ID,
   CASE 
		WHEN b.URL_DOKUMEN IS NOT NULL THEN CONCAT('${LINK_DOK}', b.URL_DOKUMEN)
		ELSE b.URL_DOKUMEN
	END URL_DOKUMEN  
FROM n2n.D_BILLING_DOKUMEN a 
join n2n.D_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID and b.JNS_DOKUMEN = '01004' where 
a.BILLING_ID = :billing_id;`

query.getDokumenPenagihan = `SELECT 
   a.BILLING_DETAIL_ID, 
   a.BILLING_ID,
   b.DOKUMEN_ID,
   b.TIPE_DOKUMEN,
   b.JNS_DOKUMEN,
   b.NO_DOKUMEN,
   TO_CHAR(b.TGL_DOKUMEN, 'DD/MM/YYYY') AS "TGL_DOKUMEN",
   b.NOTES,
   b.VALUE_DOK,
   b.PROJECT_ID,
   CASE 
		WHEN b.URL_DOKUMEN IS NOT NULL THEN CONCAT('${LINK_DOK}', b.URL_DOKUMEN)
		ELSE b.URL_DOKUMEN
	END URL_DOKUMEN 
FROM n2n.D_BILLING_DOKUMEN a 
join n2n.D_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID and b.JNS_DOKUMEN = '01005' where 
a.BILLING_ID = :billing_id;`

query.getDokumenBilling = `SELECT 
   a.BILLING_DETAIL_ID, 
   a.BILLING_ID,
   b.DOKUMEN_ID,
   b.TIPE_DOKUMEN,
   b.JNS_DOKUMEN,
   b.NO_DOKUMEN,
   TO_CHAR(b.TGL_DOKUMEN, 'YYYY-MM-DD') AS "TGL_DOKUMEN",
   b.NOTES,
   b.VALUE_DOK,
   b.PROJECT_ID,
   CASE 
		WHEN b.URL_DOKUMEN IS NOT NULL THEN CONCAT('${LINK_DOK}', b.URL_DOKUMEN)
		ELSE b.URL_DOKUMEN
	END URL_DOKUMEN 
FROM n2n.D_BILLING_DOKUMEN a 
join n2n.D_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID where 
a.BILLING_ID = :billing_id;`

query.countListBillingByTermin = `SELECT
   count(b.BILLING_ID) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit" 
FROM n2n.D_PROJECT a right join n2n.D_BILLING b on a.PROJECT_ID = b.PROJECT_ID 
:condition`;

query.getListBillingByTermin = `SELECT
   ROW_NUMBER() OVER (:order) AS row_number,
   a.PROJECT_ID, 
   b.BILLING_ID, 
   a.PROJECT_NO, 
   a.PROJECT_NAME, 
   a.NILAI_KONTRAK, 
   b.TERMIN, 
   b.DIVISI_ID, 
   b.EST_PERIODE_BILLING, 
   b.EST_BULAN_BILLING, 
   b.EST_BILLING, 
   b.REAL_PERIODE_BILLING, 
   b.REAL_BULAN_BILLING, 
   b.REAL_BILLING,  
   b.KD_STATUS, 
   c.URAIAN URAIAN_STATUS, 
   b.CREATED_BY 
FROM n2n.D_PROJECT a
right join n2n.D_BILLING b ON a.PROJECT_ID = b.PROJECT_ID 
left join n2n.M_STATUS c on c.KD_STATUS = b.KD_STATUS 
:condition 
:order
OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`

query.getListBillingProjectAkselerasi = `SELECT
   ROW_NUMBER() OVER (ORDER BY a.PROJECT_NO ASC, b.TERMIN ASC) AS row_number,
   a.PROJECT_ID, 
   b.BILLING_ID, 
   a.PROJECT_NO, 
   a.PROJECT_NAME, 
   a.NILAI_KONTRAK, 
   b.TERMIN, 
   b.DIVISI_ID, 
   b.EST_PERIODE_BILLING, 
   b.EST_BULAN_BILLING, 
   b.EST_BILLING, 
   b.REAL_PERIODE_BILLING, 
   b.REAL_BULAN_BILLING, 
   b.REAL_BILLING,  
   b.KD_STATUS, 
   c.URAIAN URAIAN_STATUS, 
   b.CREATED_BY,
   (SELECT SUM(EST_BILLING) FROM D_BILLING WHERE PROJECT_ID IN (:project_id)) AS TOTAL_EST_BILLING,
   (SELECT SUM(REAL_BILLING) FROM D_BILLING WHERE PROJECT_ID IN (:project_id)) AS TOTAL_REAL_BILLING 
FROM n2n.D_PROJECT a
right join n2n.D_BILLING b ON a.PROJECT_ID = b.PROJECT_ID 
left join n2n.M_STATUS c on c.KD_STATUS = b.KD_STATUS 
WHERE a.PROJECT_ID in (:project_id) 
ORDER BY a.PROJECT_NO ASC, b.TERMIN ASC;`

query.getListProjectForVendorProjectBilling = `SELECT
   ROW_NUMBER() OVER (:order) AS row_number,
   a.*,
   b.NO_KONTRAK,
   b.NILAI_KONTRAK,
   b.JUDUL_KONTRAK,
   m.NAMA_PERUSAHAAN NAMA_VENDOR,
   c.PROJECT_NO,
   c.PROJECT_NAME,
   m1.PORTOFOLIO as "PORTOFOLIO_UR", 
   m2.UR_REF as "PROJECT_TYPE_UR",
   m3.URAIAN as "UR_STATUS"  
FROM n2n.D_BILLING a
JOIN n2n.D_PROJECT_VENDOR b ON
	b.PROJECT_VENDOR_ID = a.PROJECT_ID
LEFT JOIN n2n.D_PROJECT c ON
	b.PROJECT_ID = c.PROJECT_ID 
LEFT JOIN n2n.M_VENDOR_PT m 
    ON m.VENDOR_ID = b.VENDOR_ID 
LEFT JOIN n2n.M_PORTOFOLIO m1 
    ON m1.PORTOFOLIO_ID = c.PORTOFOLIO_ID 
LEFT JOIN n2n.M_REFERENSI m2 
    ON m2.KD_REF = c.PROJECT_TYPE_ID AND m2.JNS_REF = lower('PROJECT_TYPE_ID') 
LEFT JOIN n2n.M_STATUS m3 
    ON m3.KD_STATUS = a.KD_STATUS 
:condition 
:order
OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`
// -- join n2n.M_STATUS d on d.KD_STATUS = b.KD_STATUS

query.countListProjectForVendorProjectBilling = `SELECT
   count(a.CREATED_AT) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit" 
FROM n2n.D_BILLING a
JOIN n2n.D_PROJECT_VENDOR b ON
	b.PROJECT_VENDOR_ID = a.PROJECT_ID
LEFT JOIN n2n.D_PROJECT c ON
	b.PROJECT_ID = c.PROJECT_ID 
LEFT JOIN n2n.M_VENDOR_PT m ON m.VENDOR_ID = b.VENDOR_ID 
:condition`;

query.getDetailCostAdvance = `SELECT 
   a.COST_ID,
   c.COST_REVENUE_ID,
   a.PROJECT_ID,
   a.KATEGORI_COST,
   a.MATA_ANGGARAN,
   a.DIVISI_ID,
   a.JENIS_COST,
   a.NILAI_COST,
   a.TANGGAL_COST,
   a.NO_PR,
   a.NO_NODIN,
   a.STATUS,
   m1.UR_REF AS KATEGORI_COST_UR, 
   m2.UR_REF AS MATA_ANGGARAN_UR, 
   m3.UR_REF AS JENIS_COST_UR,
   b.PROJECT_NAME,
   b.PROJECT_NO,
   c.NILAI_REALISASI,
   c.AGING_CA,
   c.SATUAN_CA,
   c.NILAI_PELUNASAN,
   c.STATUS_INVOICE,
   c.STATUS_PELUNASAN   
FROM n2n.D_COST_OPR a 
JOIN n2n.D_COST_REVENUE c ON 
    a.COST_ID = c.COST_ID 
JOIN n2n.D_PROJECT b ON
	b.PROJECT_ID = a.PROJECT_ID
LEFT JOIN n2n.M_REFERENSI m1 ON
	m1.KD_REF = a.KATEGORI_COST AND m1.JNS_REF = lower('kategori_cost')
LEFT JOIN n2n.M_REFERENSI m2 ON 
	m2.KD_REF = a.MATA_ANGGARAN AND m2.JNS_REF = lower('mata_anggaran') 
LEFT JOIN n2n.M_REFERENSI m3 ON 
	m3.KD_REF = a.JENIS_COST AND m2.JNS_REF = lower('jenis_cost') 
WHERE c.COST_REVENUE_ID = :cost_revenue_id;`

query.getListProjectForCostAdvanced = `SELECT
   ROW_NUMBER() OVER (:order) AS row_number,
   a.COST_ID,
   c.COST_REVENUE_ID,
   a.PROJECT_ID,
   a.KATEGORI_COST,
   a.MATA_ANGGARAN,
   a.DIVISI_ID,
   a.JENIS_COST,
   a.NILAI_COST,
   TO_CHAR(a.TANGGAL_COST, 'DD/MM/YYYY') AS "TANGGAL_COST",
   a.NO_PR,
   a.NO_NODIN,
   a.STATUS,
   m1.UR_REF AS KATEGORI_COST_UR, 
   m2.UR_REF AS MATA_ANGGARAN_UR, 
   m3.UR_REF AS JENIS_COST_UR,
   b.PROJECT_NAME,
   b.PROJECT_NO,
   c.NILAI_REALISASI,
   c.AGING_CA,
   c.SATUAN_CA,
   c.NILAI_PELUNASAN,
   c.STATUS_INVOICE,
   c.STATUS_PELUNASAN   
FROM n2n.D_COST_OPR a 
LEFT JOIN n2n.D_COST_REVENUE c ON 
    a.COST_ID = c.COST_ID 
LEFT JOIN n2n.D_PROJECT b ON
	b.PROJECT_ID = a.PROJECT_ID
LEFT JOIN n2n.M_REFERENSI m1 ON
	m1.KD_REF = a.KATEGORI_COST AND m1.JNS_REF = lower('kategori_cost')
LEFT JOIN n2n.M_REFERENSI m2 ON 
	m2.KD_REF = a.MATA_ANGGARAN AND m2.JNS_REF = lower('mata_anggaran') 
LEFT JOIN n2n.M_REFERENSI m3 ON 
	m3.KD_REF = a.JENIS_COST AND m2.JNS_REF = lower('jenis_cost') 
:condition 
:order
OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`

query.countListProjectForCostAdvanced = `SELECT 
   count(a.TANGGAL_COST) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit" 
FROM n2n.D_COST_OPR a 
LEFT JOIN n2n.D_COST_REVENUE c ON 
    a.COST_ID = c.COST_ID 
LEFT JOIN n2n.D_PROJECT b ON 
	b.PROJECT_ID = a.PROJECT_ID
LEFT JOIN n2n.M_REFERENSI m1 ON
	m1.KD_REF = a.KATEGORI_COST AND m1.JNS_REF = lower('kategori_cost')
LEFT JOIN n2n.M_REFERENSI m2 ON 
	m2.KD_REF = a.MATA_ANGGARAN AND m2.JNS_REF = lower('mata_anggaran') 
LEFT JOIN n2n.M_REFERENSI m3 ON 
	m3.KD_REF = a.JENIS_COST AND m2.JNS_REF = lower('jenis_cost') 
:condition`;

query.getDetailTagihanVendor = `SELECT 
   d.BILLING_REVENUE_ID,
   d.NO_TTB,
   d.STATUS_SSC,
   d.AGING_INVOICE,
   d.SUPPLY_STATUS,
   d.TANGGAL_SELESAI_SSC,
   d.KETERANGAN,
   a.BILLING_ID,
   d.STATUS_PYMAD,
   d.NOMINAL_PYMAD,
   d.TANGGAL_BAST,
   d.NO_INVOICE,
   d.TANGGAL_INVOICE,
   d.STATUS_INVOICE,
   d.NOMINAL_INVOICE,
   d.NO_FAKTUR,
   d.TANGGAL_FAKTUR,
   d.STATUS_PELUNASAN,
   d.NOMINAL_PELUNASAN,
   d.TANGGAL_PELUNASAN,
   d.DENDA_PAJAK,
   d.PPH,
   b.NO_KONTRAK,
   b.NILAI_KONTRAK,
   b.JUDUL_KONTRAK,
   m.NAMA_PERUSAHAAN NAMA_VENDOR,
   c.PROJECT_NO,
   c.PROJECT_NAME,
   b.PROJECT_VENDOR_ID   
FROM n2n.D_BILLING a 
JOIN n2n.D_PROJECT_VENDOR b ON
	b.PROJECT_VENDOR_ID = a.PROJECT_ID 
LEFT JOIN n2n.D_BILLING_REVENUE d ON 
    d.BILLING_ID = a.BILLING_ID 
LEFT JOIN n2n.D_PROJECT c ON 
	b.PROJECT_ID = c.PROJECT_ID 
LEFT JOIN n2n.M_VENDOR_PT m ON m.VENDOR_ID = b.VENDOR_ID 
WHERE a.BILLING_ID = :billing_id;`

query.getListProjectForTagihanVendor = `SELECT
   ROW_NUMBER() OVER (:order) AS row_number,
   d.BILLING_REVENUE_ID,
   a.BILLING_ID,
   d.STATUS_PYMAD,
   d.NOMINAL_PYMAD,
   TO_CHAR(d.TANGGAL_BAST, 'DD/MM/YYYY') TANGGAL_BAST,
   d.NO_INVOICE,
   TO_CHAR(d.TANGGAL_INVOICE, 'DD/MM/YYYY') TANGGAL_INVOICE,
   d.STATUS_INVOICE,
   d.NOMINAL_INVOICE,
   d.NO_FAKTUR,
   TO_CHAR(d.TANGGAL_FAKTUR, 'DD/MM/YYYY') TANGGAL_FAKTUR,
   d.STATUS_PELUNASAN,
   d.NOMINAL_PELUNASAN,
   TO_CHAR(d.TANGGAL_PELUNASAN, 'DD/MM/YYYY') TANGGAL_PELUNASAN,
   d.DENDA_PAJAK,
   d.PPH,
   b.NO_KONTRAK,
   b.NILAI_KONTRAK,
   m.NAMA_PERUSAHAAN NAMA_VENDOR,
   c.PROJECT_NO,
   c.PROJECT_NAME,
   b.PROJECT_VENDOR_ID,
   b.JUDUL_KONTRAK,
   CASE 
    WHEN a.KD_STATUS IN ('302') THEN 
    1 
    ELSE 0 END 
    AS FLAG_REJECT 
FROM n2n.D_BILLING a 
JOIN n2n.D_PROJECT_VENDOR b ON
	b.PROJECT_VENDOR_ID = a.PROJECT_ID 
LEFT JOIN n2n.D_BILLING_REVENUE d ON 
    d.BILLING_ID = a.BILLING_ID 
LEFT JOIN n2n.D_PROJECT c ON 
	b.PROJECT_ID = c.PROJECT_ID 
LEFT JOIN n2n.M_VENDOR_PT m ON m.VENDOR_ID = b.VENDOR_ID 
WHERE a.KD_STATUS IN (301, 302, 400, 401, 402, 403) 
:condition 
:order
OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`
// LEFT JOIN n2n.D_BILLING_REVENUE d ON 

query.countListProjectForTagihanVendor = `SELECT
   count(a.CREATED_AT) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit" 
FROM n2n.D_BILLING a 
JOIN n2n.D_PROJECT_VENDOR b ON
	b.PROJECT_VENDOR_ID = a.PROJECT_ID
LEFT JOIN n2n.D_BILLING_REVENUE d ON 
    d.BILLING_ID = a.BILLING_ID 
LEFT JOIN n2n.D_PROJECT c ON
b.PROJECT_ID = c.PROJECT_ID 
LEFT JOIN n2n.M_VENDOR_PT m ON m.VENDOR_ID = b.VENDOR_ID 
:condition`;

query.getDetailProject = `SELECT
   a.*,
   0 as GROSS_MARGIN_PENAWARAN,
   0 as GROSS_MARGIN_KONTRAK,
   0 as NILAI_GROSS_MARGIN_PENAWARAN,
   0 as NILAI_GROSS_MARGIN_KONTRAK,
   b.UR_REF as "PROJECT_KATEGORI_UR",
   c.UR_REF as "PROJECT_TYPE_UR",
   d.PORTOFOLIO as "PORTOFOLIO_UR",
   e.UR_REF as "CATEGORY_UR",
   f.CUSTOMER_NAME,
   g.UR_REF as "UR_AREA",
   h.URAIAN as "UR_STATUS",
   i.UR_REF as "UR_SPUC",
   j.UR_REF as "SUBPORTOFOLIO_UR",
   k.UR_REF as "PRODUKKATEGORI_UR",
   a.PROJECT_OWNER as PROJECT_OWNER_ID,
   a.PROJECT_OWNER as PROJECT_OWNER_UR,
   l.UR_REF as "TYPE_VALIDASI_UR",
   a.KD_SUB_PORTOFOLIO as SUBPORTOFOLIO_ID,
   m.UR_REF as "PROJECT_MODEL_UR",
   (SELECT
        COUNT(x3.PROJECT_ID)
    FROM D_PROJECT x3
    WHERE x3.PROJECT_TYPE_ID = '2'
    AND x3.PROJECT_ACTUAL_ID = a.PROJECT_ID) AS "TOTAL_AKSELERASI",
   (SELECT TO_NUMBER(
        CASE
            WHEN
                    a.PROJECT_TYPE_ID = '1'
                AND (SELECT COUNT(x1.PROJECT_ID) FROM N2N.D_DOKUMEN x1 WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.TIPE_DOKUMEN = '01') >= 1
                AND a.KD_STATUS in ('002','003')
                AND a.KD_ARCHIVE IS NULL
                AND (SELECT COUNT(x2.PROJECT_ID) FROM N2N.D_PROJECT x2 WHERE x2.PROJECT_ACTUAL_ID = a.PROJECT_ID AND x2.PROJECT_TYPE_ID = '2') = 0
                    THEN '1' --TO ACCELERATION
            ELSE '0'
        END) "TOTAL"
    FROM DUAL) AS "TO_AKSELERASI",
    (SELECT TO_NUMBER(
        CASE
            WHEN a.PROJECT_TYPE_ID = '1' AND a.KD_STATUS not in ('005') AND a.KD_ARCHIVE IS NULL THEN '1' --TO ACCELERATION
            WHEN a.PROJECT_TYPE_ID = '2'
                 AND (SELECT COUNT(x1.PROJECT_ID) FROM N2N.D_DOKUMEN x1 WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.TIPE_DOKUMEN = '01') >= 1
                 AND a.KD_STATUS in ('002')
                 AND a.KD_ARCHIVE IS NULL
                THEN '1' --MARK AS
            ELSE '0'
        END) "TOTAL"
    FROM DUAL) AS "TO_MARK",
    CASE 
		WHEN	
			(SELECT
				COUNT(x1.STATUS_ID)
			FROM N2N.D_PROJECT_STATUS x1
			WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.ID_TAB_STATUS = 'HK1' AND x1.KD_STATUS = '200') > 0
			THEN 0
		ELSE 1
	END FLAG_VENDOR,
    y.DETAIL_VENDOR as VENDOR_PLANNING,
    z.DETAIL_VENDOR as VENDOR_FINAL,
    a.DOKUMEN_BAMK_ID  
FROM n2n.D_PROJECT a
LEFT JOIN n2n.M_REFERENSI b ON b.KD_REF = a.PROJECT_KATEGORI_ID AND b.JNS_REF = lower('PROJECT_KATEGORI_ID')
LEFT JOIN n2n.M_REFERENSI c ON c.KD_REF = a.PROJECT_TYPE_ID AND c.JNS_REF = lower('PROJECT_TYPE_ID')
LEFT JOIN n2n.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = a.PORTOFOLIO_ID
LEFT JOIN n2n.M_REFERENSI e ON e.KD_REF = a.CATEGORY_ID AND e.JNS_REF = lower('CATEGORY_ID')
LEFT JOIN n2n.M_CUSTOMER f ON f.CUSTOMER_ID = a.CUSTOMER_ID AND f.FLAG_AKTIF = 'Y'
LEFT JOIN n2n.M_REFERENSI g ON g.KD_REF = a.KD_AREA AND g.JNS_REF = lower('KD_AREA')
LEFT JOIN n2n.M_STATUS h ON h.KD_STATUS = a.KD_STATUS AND h.ID_TAB_STATUS = 'SA1'
LEFT JOIN n2n.M_REFERENSI i ON i.KD_REF = a.KD_SPUC AND i.JNS_REF = lower('KD_SPUC') 
LEFT JOIN n2n.M_REFERENSI j ON j.KD_REF = a.KD_SUB_PORTOFOLIO AND j.JNS_REF = lower('SUB_PORTOFOLIO')
LEFT JOIN n2n.M_REFERENSI k ON k.KD_REF = a.KD_CAT_PRODUCT AND k.JNS_REF = lower('CAT_PRODUCT')
LEFT JOIN n2n.M_REFERENSI l ON l.KD_REF = a.TYPE_VALIDASI_ID AND l.JNS_REF = lower('TYPE_VALIDASI')
LEFT JOIN n2n.M_REFERENSI m ON m.KD_REF = a.PROJECT_MODEL_ID AND m.JNS_REF = lower('CATEGORY_PROJECT')
LEFT JOIN (
    SELECT
        a.PROJECT_ID,
        SUM(a.NILAI_KONTRAK) AS NILAI_KONTRAK,
        JSON_ARRAYAGG(
            JSON_OBJECT('PROJECT_VENDOR_ID' VALUE a.PROJECT_VENDOR_ID,
                        'PROJECT_ID' VALUE a.PROJECT_ID,
                        'VENDOR_ID' VALUE a.VENDOR_ID,
                        'NAMA_VENDOR' VALUE b.NAMA_PERUSAHAAN,
                        'NILAI_KONTRAK' VALUE a.NILAI_KONTRAK,
                        'NO_KONTRAK' VALUE a.NO_KONTRAK,
                        'JUDUL_KONTRAK' VALUE a.JUDUL_KONTRAK,
                        'FLAG_REJECT' VALUE a.FLAG_REJECT,
                        'REASON_REJECT' VALUE a.REASON_REJECT,
                        'HARGA_NEGOSIASI' VALUE a.NILAI_KONTRAK)) DETAIL_VENDOR
    FROM N2N.D_PROJECT_VENDOR a
    LEFT JOIN N2N.M_VENDOR_PT b ON b.VENDOR_ID = a.VENDOR_ID
    WHERE
        a.FLAG_FINAL = 'T'
    GROUP BY a.PROJECT_ID) y ON y.PROJECT_ID = a.PROJECT_ID
LEFT JOIN (
    SELECT
        a.PROJECT_ID,
        SUM(a.NILAI_KONTRAK) AS NILAI_KONTRAK,
        JSON_ARRAYAGG(
            JSON_OBJECT('PROJECT_VENDOR_ID' VALUE a.PROJECT_VENDOR_ID,
                        'PROJECT_ID' VALUE a.PROJECT_ID,
                        'VENDOR_ID' VALUE a.VENDOR_ID,
                        'NAMA_VENDOR' VALUE b.NAMA_PERUSAHAAN,
                        'NILAI_KONTRAK' VALUE a.NILAI_KONTRAK,
                        'NO_KONTRAK' VALUE a.NO_KONTRAK,
                        'JUDUL_KONTRAK' VALUE a.JUDUL_KONTRAK,
                        'START_DATE' VALUE TO_CHAR(a.START_DATE, 'YYYY-MM-DD'),
                        'END_DATE' VALUE TO_CHAR(a.END_DATE, 'YYYY-MM-DD'),
                        'HARGA_NEGOSIASI' VALUE a.NILAI_KONTRAK)) DETAIL_VENDOR
    FROM N2N.D_PROJECT_VENDOR a
    LEFT JOIN N2N.M_VENDOR_PT b ON b.VENDOR_ID = a.VENDOR_ID
    WHERE
        a.FLAG_FINAL = 'Y'
    GROUP BY a.PROJECT_ID) z ON z.PROJECT_ID = a.PROJECT_ID 
where
    a.PROJECT_ID = :project_id;`

query.getDetailProjectByNo = `SELECT
   a.*,
   0 as GROSS_MARGIN_PENAWARAN,
   0 as GROSS_MARGIN_KONTRAK,
   0 as NILAI_GROSS_MARGIN_PENAWARAN,
   0 as NILAI_GROSS_MARGIN_KONTRAK,
   b.UR_REF as "PROJECT_KATEGORI_UR",
   c.UR_REF as "PROJECT_TYPE_UR",
   d.PORTOFOLIO as "PORTOFOLIO_UR",
   e.UR_REF as "CATEGORY_UR",
   f.CUSTOMER_NAME,
   g.UR_REF as "UR_AREA",
   h.URAIAN as "UR_STATUS",
   i.UR_REF as "UR_SPUC",
   (SELECT
        COUNT(x3.PROJECT_ID)
    FROM D_PROJECT x3
    WHERE x3.PROJECT_TYPE_ID = '2'
    AND x3.PROJECT_ACTUAL_ID = a.PROJECT_ID) AS "TOTAL_AKSELERASI",
   (SELECT TO_NUMBER(
        CASE
            WHEN
                    a.PROJECT_TYPE_ID = '1'
                AND (SELECT COUNT(x1.PROJECT_ID) FROM N2N.D_DOKUMEN x1 WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.TIPE_DOKUMEN = '01') >= 1
                AND a.KD_STATUS in ('002','003')
                AND a.KD_ARCHIVE IS NULL
                AND (SELECT COUNT(x2.PROJECT_ID) FROM N2N.D_PROJECT x2 WHERE x2.PROJECT_ACTUAL_ID = a.PROJECT_ID AND x2.PROJECT_TYPE_ID = '2') = 0
                    THEN '1' --TO ACCELERATION
            ELSE '0'
        END) "TOTAL"
    FROM DUAL) AS "TO_AKSELERASI",
    (SELECT TO_NUMBER(
        CASE
            WHEN a.PROJECT_TYPE_ID = '1' AND a.KD_ARCHIVE IS NULL THEN '1' --TO ACCELERATION
            WHEN a.PROJECT_TYPE_ID = '2'
                 AND (SELECT COUNT(x1.PROJECT_ID) FROM N2N.D_DOKUMEN x1 WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.TIPE_DOKUMEN = '01') >= 1
                 AND a.KD_STATUS in ('002')
                 AND a.KD_ARCHIVE IS NULL
                THEN '1' --MARK AS
            ELSE '0'
        END) "TOTAL"
    FROM DUAL) AS "TO_MARK",
    CASE 
		WHEN	
			(SELECT
				1
			FROM N2N.D_PROJECT_STATUS x1
			WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.ID_TAB_STATUS = 'HK1' AND x1.KD_STATUS = '200') IS NOT NULL
			THEN 0
		ELSE 1
	END FLAG_VENDOR,
    y.DETAIL_VENDOR as VENDOR_PLANNING,
    z.DETAIL_VENDOR as VENDOR_FINAL,
    a.DOKUMEN_BAMK_ID  
FROM n2n.D_PROJECT a
LEFT JOIN n2n.M_REFERENSI b ON b.KD_REF = a.PROJECT_KATEGORI_ID AND b.JNS_REF = lower('PROJECT_KATEGORI_ID')
LEFT JOIN n2n.M_REFERENSI c ON c.KD_REF = a.PROJECT_TYPE_ID AND c.JNS_REF = lower('PROJECT_TYPE_ID')
LEFT JOIN n2n.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = a.PORTOFOLIO_ID
LEFT JOIN n2n.M_REFERENSI e ON e.KD_REF = a.CATEGORY_ID AND e.JNS_REF = lower('CATEGORY_ID')
LEFT JOIN n2n.M_CUSTOMER f ON f.CUSTOMER_ID = a.CUSTOMER_ID AND f.FLAG_AKTIF = 'Y'
LEFT JOIN n2n.M_REFERENSI g ON g.KD_REF = a.KD_AREA AND g.JNS_REF = lower('KD_AREA')
LEFT JOIN n2n.M_STATUS h ON h.KD_STATUS = a.KD_STATUS AND h.ID_TAB_STATUS = 'SA1' 
LEFT JOIN n2n.M_REFERENSI i ON i.KD_REF = a.KD_SPUC AND i.JNS_REF = lower('KD_SPUC')
LEFT JOIN (
    SELECT
        a.PROJECT_ID,
        SUM(a.NILAI_KONTRAK) AS NILAI_KONTRAK,
        JSON_ARRAYAGG(
            JSON_OBJECT('PROJECT_VENDOR_ID' VALUE a.PROJECT_VENDOR_ID,
                        'PROJECT_ID' VALUE a.PROJECT_ID,
                        'VENDOR_ID' VALUE a.VENDOR_ID,
                        'NAMA_VENDOR' VALUE b.NAMA_PERUSAHAAN,
                        'NILAI_KONTRAK' VALUE a.NILAI_KONTRAK,
                        'NO_KONTRAK' VALUE a.NO_KONTRAK,
                        'JUDUL_KONTRAK' VALUE a.JUDUL_KONTRAK,
                        'HARGA_NEGOSIASI' VALUE a.NILAI_KONTRAK)) DETAIL_VENDOR
    FROM N2N.D_PROJECT_VENDOR a
    LEFT JOIN N2N.M_VENDOR_PT b ON b.VENDOR_ID = a.VENDOR_ID
    WHERE
        a.FLAG_FINAL = 'T'
    GROUP BY a.PROJECT_ID) y ON y.PROJECT_ID = a.PROJECT_ID
LEFT JOIN (
    SELECT
        a.PROJECT_ID,
        SUM(a.NILAI_KONTRAK) AS NILAI_KONTRAK,
        JSON_ARRAYAGG(
            JSON_OBJECT('PROJECT_VENDOR_ID' VALUE a.PROJECT_VENDOR_ID,
                        'PROJECT_ID' VALUE a.PROJECT_ID,
                        'VENDOR_ID' VALUE a.VENDOR_ID,
                        'NAMA_VENDOR' VALUE b.NAMA_PERUSAHAAN,
                        'NILAI_KONTRAK' VALUE a.NILAI_KONTRAK,
                        'NO_KONTRAK' VALUE a.NO_KONTRAK,
                        'JUDUL_KONTRAK' VALUE a.JUDUL_KONTRAK,
                        'START_DATE' VALUE TO_CHAR(a.START_DATE, 'YYYY-MM-DD'),
                        'END_DATE' VALUE TO_CHAR(a.END_DATE, 'YYYY-MM-DD'),
                        'HARGA_NEGOSIASI' VALUE a.NILAI_KONTRAK)) DETAIL_VENDOR
    FROM N2N.D_PROJECT_VENDOR a
    LEFT JOIN N2N.M_VENDOR_PT b ON b.VENDOR_ID = a.VENDOR_ID
    WHERE
        a.FLAG_FINAL = 'Y'
    GROUP BY a.PROJECT_ID) z ON z.PROJECT_ID = a.PROJECT_ID 
where
    a.PROJECT_NO = :project_no AND a.FLAG_AKTIF = 'T';`

query.getCBBPlanning = `SELECT
	a.*
FROM 
	N2N.D_PROJECT_CBB a
WHERE 
	a.PROJECT_ID = :project_id`

query.getCostPersonilPlanning = `SELECT 
	a.*,
	b.UR_REF AS UR_POSITION,
	c.UR_REF AS UR_KUALIFIKASI,
	d.UR_REF AS UR_SATUAN_PERSON,
	e.UR_REF AS UR_SATUAN_DATE
FROM
	N2N.D_PERSONIL a
LEFT JOIN N2N.M_REFERENSI b ON b.KD_REF = a.POSITION_ID  AND b.JNS_REF = 'position_id'
LEFT JOIN N2N.M_REFERENSI c ON c.KD_REF = a.KUALIFIKASI_ID  AND c.JNS_REF = 'kualifikasi_id'
LEFT JOIN N2N.M_REFERENSI d ON d.KD_REF = a.SATUAN_PERSON  AND d.JNS_REF = 'satuan_person'
LEFT JOIN N2N.M_REFERENSI e ON e.KD_REF = a.SATUAN_DATE  AND e.JNS_REF = 'satuan_date'
WHERE 
	a.PROJECT_ID = :project_id`

query.getCostVendorPlanning = `SELECT 
	a.*,
	b.UR_REF AS UR_POSITION,
	c.UR_REF AS UR_KUALIFIKASI,
	d.UR_REF AS UR_SATUAN_PERSON,
	e.UR_REF AS UR_SATUAN_DATE,
    vp.VENDOR_ID,
    vp.NAMA_PERUSAHAAN AS NAMA_VENDOR 
FROM
	N2N.D_PERSONIL a INNER JOIN N2N.D_PROJECT_VENDOR pv ON pv.PROJECT_VENDOR_ID = a.PROJECT_ID 
    INNER JOIN N2N.M_VENDOR_PT vp ON vp.VENDOR_ID = pv.VENDOR_ID 
LEFT JOIN N2N.M_REFERENSI b ON b.KD_REF = a.POSITION_ID  AND b.JNS_REF = 'position_id'
LEFT JOIN N2N.M_REFERENSI c ON c.KD_REF = a.KUALIFIKASI_ID  AND c.JNS_REF = 'kualifikasi_id'
LEFT JOIN N2N.M_REFERENSI d ON d.KD_REF = a.SATUAN_PERSON  AND d.JNS_REF = 'satuan_person'
LEFT JOIN N2N.M_REFERENSI e ON e.KD_REF = a.SATUAN_DATE  AND e.JNS_REF = 'satuan_date'
WHERE 
	pv.PROJECT_ID = :project_id`

query.getBillingCollection = `
SELECT 
	a.*,
    CONCAT(CONCAT(a.EST_PERIODE_BILLING,'-'), a.EST_BULAN_BILLING) ESTIMATE_PERIODE_BILLING,
    (SELECT TO_NUMBER(
        CASE 
	    	WHEN (a.KD_STATUS IS NULL OR a.KD_STATUS IN ('300','302')) THEN '1'
	    	ELSE '0'
	    END) "TOTAL"
    FROM DUAL) AS "FLAG_EDIT",
    CASE 
        WHEN a.KD_STATUS = '302' THEN 
            'Rejected' 
        WHEN a.KD_STATUS IN ('301', '400', '401', '402') THEN 
            'Sent' 
        ELSE '-' 
    END AS STATUS_BILLING,
    CASE 
        WHEN a.KD_STATUS = '302' THEN 
            (SELECT NOTES FROM N2N.D_PROJECT_STATUS b WHERE b.PROJECT_ID = a.BILLING_ID ORDER BY b.DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) 
        ELSE '-' 
    END AS URAIAN_STATUS,
    p.PROJECT_NO || ' - ' || p.PROJECT_NAME AS NOMOR_PROJECT
FROM
	N2N.D_BILLING a
LEFT JOIN N2N.D_PROJECT p 
    ON p.PROJECT_ID = a.SOURCE_PROJECT_ID
WHERE 
	a.PROJECT_ID = :project_id AND a.FLAG_PARENT IN (1, 2) ORDER BY TO_NUMBER(a.TERMIN) ASC`

query.getBillingCollectionProjectActual = `
    SELECT 
        a.*,
        CONCAT(CONCAT(a.EST_PERIODE_BILLING,'-'), a.EST_BULAN_BILLING) ESTIMATE_PERIODE_BILLING,
        (SELECT TO_NUMBER(
            CASE 
                WHEN (a.KD_STATUS IS NULL OR a.KD_STATUS IN ('300','302')) THEN '1'
                ELSE '0'
            END) "TOTAL"
        FROM DUAL) AS "FLAG_EDIT",
        CASE 
            WHEN a.KD_STATUS = '302' THEN 
                (SELECT NOTES FROM N2N.D_PROJECT_STATUS b WHERE b.PROJECT_ID = a.BILLING_ID ORDER BY b.DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) 
            ELSE '-' 
        END AS URAIAN_STATUS,
        m.UR_REF AS DIVISI 
    FROM
        N2N.D_BILLING a LEFT JOIN M_REFERENSI m ON a.DIVISI_ID = m.KD_REF AND m.JNS_REF = 'div_billing_id' 
    WHERE 
        a.PROJECT_ID = :project_id AND (a.KD_STATUS IN ('300', '302', '303') OR a.KD_STATUS IS NULL);`


query.getStatusBilling = `
SELECT 
	a.PROJECT_ID AS BILLING_ID,
	a.KD_STATUS,
	a.DATE_STATUS,
    e.URAIAN UR_STATUS,
	a.NOTES,
    c.PROJECT_ID,
    c.PROJECT_NO,    
    c.PROJECT_NAME,
    d.PORTOFOLIO,
    b.BILLING_CODE,
    (CASE WHEN a.FLAG_NEW_DOK IS NULL 
        THEN '0'
    ELSE a.FLAG_NEW_DOK END) AS FLAG_NEW_DOK 
FROM
	N2N.D_PROJECT_STATUS a 
    INNER JOIN N2N.D_BILLING b
        ON a.PROJECT_ID = b.BILLING_ID 
    INNER JOIN N2N.D_PROJECT c 
        ON c.PROJECT_ID = b.PROJECT_ID 
    LEFT JOIN N2N.M_PORTOFOLIO d 
        ON d.PORTOFOLIO_ID = c.PORTOFOLIO_ID 
    LEFT JOIN N2N.M_STATUS e 
        ON e.KD_STATUS = a.KD_STATUS 
WHERE 
	a.PROJECT_ID = :billing_id ORDER BY a.DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY`

query.getVendorPlanning = `SELECT 
	a.*,
	b.NAMA_PERUSAHAAN AS UR_VENDOR,
    CASE 
		WHEN	
			(SELECT
				1
			FROM N2N.D_PROJECT_STATUS x1
			WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.ID_TAB_STATUS = 'HK1' AND x1.KD_STATUS = '000') IS NOT NULL
			THEN 0
		ELSE 1
	END flag_crud
FROM
	N2N.D_PROJECT_VENDOR a
LEFT JOIN N2N.M_VENDOR_PT b ON a.VENDOR_ID = b.VENDOR_ID
WHERE 
	a.PROJECT_ID = :project_id`

query.getDokumenProject = `SELECT 
	a.DOKUMEN_ID,
	a.TIPE_DOKUMEN ,
	a.JNS_DOKUMEN,
	b.UR_REF AS "URAIAN_JENIS",
	a.NO_DOKUMEN,
	a.TGL_DOKUMEN,
	a.PERIHAL,
	CASE 
		WHEN a.URL_DOKUMEN IS NOT NULL THEN CONCAT('${LINK_DOK}', a.URL_DOKUMEN)
		ELSE a.URL_DOKUMEN
	END URL_DOKUMEN,
	a.NOTES,
	a.VALUE_DOK,
	a.PROJECT_ID,
    a.NAME_PEO,
    a.CREATED_AT 
FROM
	N2N.D_DOKUMEN a
LEFT JOIN N2N.M_REFERENSI b ON b.KD_REF = a.JNS_DOKUMEN AND a.TIPE_DOKUMEN = b.SUB_KD_REF 
WHERE 
	a.PROJECT_ID = :project_id AND a.JNS_DOKUMEN NOT IN ('01003', '01004', '01032') 
	AND 
	a.TIPE_DOKUMEN = :tipe_dokumen order by a.CREATED_AT ASC`

query.getDokumenProjectByJnsDokumen = `SELECT 
	a.DOKUMEN_ID,
	a.TIPE_DOKUMEN ,
	a.JNS_DOKUMEN,
	b.UR_REF AS "URAIAN_JENIS",
	a.NO_DOKUMEN,
	a.TGL_DOKUMEN,
	CASE 
		WHEN a.URL_DOKUMEN IS NOT NULL THEN CONCAT('${LINK_DOK}', a.URL_DOKUMEN)
		ELSE a.URL_DOKUMEN
	END URL_DOKUMEN,
	a.NOTES,
	a.VALUE_DOK,
	a.PROJECT_ID,
    a.CREATED_AT 
FROM
	N2N.D_DOKUMEN a
LEFT JOIN N2N.M_REFERENSI b ON b.KD_REF = a.JNS_DOKUMEN AND a.TIPE_DOKUMEN = b.SUB_KD_REF 
WHERE 
	a.PROJECT_ID = :project_id
	AND 
	a.JNS_DOKUMEN = :jns_dokumen`

query.getSubReferensiByJenis = `SELECT
    a.kd_ref,
    a.ur_ref,
    a.jns_ref,
    a.sub_kd_ref 
FROM m_referensi a 
WHERE
    a.jns_ref = :jns_ref :condition AND a.flag_aktif = 'Y'
AND
    UPPER(a.ur_ref) like UPPER(:keyword) ORDER BY a.ur_ref ASC`

query.getSubReferensiByJenis2 = `SELECT
    a.KD_REF "kd_ref",
    a.UR_REF "ur_ref",
    a.JNS_REF "jns_ref",
    a.SUB_KD_REF "sub_kd_ref",
    a.SUB_JNS_REF "sub_jns_ref" 
FROM N2N.M_REFERENSI a WHERE a.FLAG_AKTIF = 'Y' AND a.JNS_REF = :jns_ref
AND
    a.SUB_KD_REF = :kd_ref
AND
    UPPER(a.UR_REF) like UPPER(:keyword) ORDER BY a.UR_REF ASC`

query.getValidasi = `SELECT
    a.KD_REF "kd_ref",
    a.UR_REF "ur_ref",
    a.JNS_REF "jns_ref",
    a.SUB_KD_REF "sub_kd_ref",
    a.SUB_JNS_REF "sub_jns_ref" 
FROM N2N.M_REFERENSI a WHERE a.FLAG_AKTIF = 'Y' AND a.JNS_REF = :jns_ref
AND
    a.SUB_KD_REF = :kd_ref
AND
    (
        a.SUB_JNS_REF = :sub_jns_ref OR :sub_jns_ref IS NULL
    )
AND
    UPPER(a.UR_REF) like UPPER(:keyword) ORDER BY a.UR_REF ASC`

query.getAcl = `SELECT
    a.KD_REF,
    b.UR_REF,
    a.SUB_KD_REF as "ID_ACL"
FROM N2N.M_REFERENSI a
JOIN N2N.M_REFERENSI b ON b.KD_REF = a.KD_REF AND b.JNS_REF = 'ref_permissions'
WHERE
    a.JNS_REF = 'acl_has_permissions'
AND a.SUB_KD_REF = :id_acl
AND a.FLAG_AKTIF = 'Y'`

query.getListProjectVendor = `SELECT 
    ROW_NUMBER() OVER (:order) AS row_number,
    a.PROJECT_ID,
    a.PROJECT_NO,
    a.PROJECT_NAME,
    b.NILAI_KONTRAK as EST_HARGA_PEMENUHAN,
    b.DETAIL_VENDOR as DETAIL_VENDOR
FROM N2N.D_PROJECT a 
LEFT JOIN (
    SELECT
        a.PROJECT_ID,
        SUM(a.NILAI_KONTRAK) AS NILAI_KONTRAK,
        JSON_ARRAYAGG(
            JSON_OBJECT('PROJECT_VENDOR_ID' VALUE a.PROJECT_VENDOR_ID,
                        'PROJECT_ID' VALUE a.PROJECT_ID,
                        'NAMA_VENDOR' VALUE b.NAMA_PERUSAHAAN,
                        'NILAI_KONTRAK' VALUE a.NILAI_KONTRAK,
                        'NO_KONTRAK' VALUE a.NO_KONTRAK,
                        'JUDUL_KONTRAK' VALUE a.JUDUL_KONTRAK,
                        'HARGA_NEGOSIASI' VALUE a.NILAI_KONTRAK)) DETAIL_VENDOR
    FROM N2N.D_PROJECT_VENDOR a
    LEFT JOIN N2N.M_VENDOR_PT b ON b.VENDOR_ID = a.VENDOR_ID
    WHERE
        a.FLAG_FINAL = 'Y'
    OR (a.FLAG_FINAL = 'T'
        AND NOT EXISTS (SELECT
                            1
                        FROM N2N.D_PROJECT_VENDOR
                        WHERE FLAG_FINAL = 'Y' AND PROJECT_ID = a.PROJECT_ID))
    GROUP BY a.PROJECT_ID) b ON b.PROJECT_ID = a.PROJECT_ID  
WHERE
    (a.KD_STATUS = '004' OR a.KD_STATUS = '005') AND (SELECT COUNT(c.STATUS_ID) FROM n2n.D_PROJECT_STATUS c WHERE c.PROJECT_ID = a.PROJECT_ID AND c.ID_TAB_STATUS = 'HK1') > 0 AND 
    (a.PROJECT_NO like :keyword
    OR upper(a.PROJECT_NAME) like upper(:keyword)
    OR upper(a.PROJECT_NO) like upper(:keyword)) 
    :condition 
:order
OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`

query.countListProjectVendor = `SELECT
   count(a.PROJECT_ID) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit"
FROM N2N.D_PROJECT a 
JOIN n2n.D_PROJECT_STATUS c ON c.PROJECT_ID = a.PROJECT_ID 
LEFT JOIN (
    SELECT
        a.PROJECT_ID,
        SUM(a.NILAI_KONTRAK) AS NILAI_KONTRAK,
        JSON_ARRAYAGG(
            JSON_OBJECT('PROJECT_VENDOR_ID' VALUE a.PROJECT_VENDOR_ID,
                        'PROJECT_ID' VALUE a.PROJECT_ID,
                        'NAMA_VENDOR' VALUE b.NAMA_PERUSAHAAN,
                        'NILAI_KONTRAK' VALUE a.NILAI_KONTRAK,
                        'NO_KONTRAK' VALUE a.NO_KONTRAK,
                        'JUDUL_KONTRAK' VALUE a.JUDUL_KONTRAK,
                        'HARGA_NEGOSIASI' VALUE a.NILAI_KONTRAK)) DETAIL_VENDOR
    FROM N2N.D_PROJECT_VENDOR a
    LEFT JOIN N2N.M_VENDOR_PT b ON b.VENDOR_ID = a.VENDOR_ID
    WHERE
        a.FLAG_FINAL = 'Y'
    OR (a.FLAG_FINAL = 'T'
        AND NOT EXISTS (SELECT
                            1
                        FROM N2N.D_PROJECT_VENDOR
                        WHERE FLAG_FINAL = 'Y' AND PROJECT_ID = a.PROJECT_ID))
    GROUP BY a.PROJECT_ID) b ON b.PROJECT_ID = a.PROJECT_ID  
WHERE
    a.KD_STATUS = '004' AND c.ID_TAB_STATUS = 'HK1' AND 
    (a.PROJECT_NO like :keyword
    OR upper(a.PROJECT_NAME) like upper(:keyword)
    OR upper(a.PROJECT_NO) like upper(:keyword)) 
    :condition`;

query.getDetailProjectVendor = `--DETAIL PROJECT VENDOR--
SELECT
    a.PROJECT_ID,
    a.PROJECT_NO,
    a.PROJECT_NAME,
    CASE
        WHEN c.PROJECT_ID is NULL THEN b.NILAI_KONTRAK
        ELSE c.NILAI_KONTRAK
    END EST_HARGA_PEMENUHAN,
    a.CONTRACT_START,
    a.CONTRACT_END,
    b.DETAIL_VENDOR as VENDOR_PLANNING,
    c.DETAIL_VENDOR as VENDOR_FINAL,
    a.DOKUMEN_BAMK_ID 
FROM N2N.D_PROJECT a
LEFT JOIN (
    SELECT
        a.PROJECT_ID,
        SUM(a.NILAI_KONTRAK) AS NILAI_KONTRAK,
        JSON_ARRAYAGG(
            JSON_OBJECT('PROJECT_VENDOR_ID' VALUE a.PROJECT_VENDOR_ID,
                        'PROJECT_ID' VALUE a.PROJECT_ID,
                        'NAMA_VENDOR' VALUE b.NAMA_PERUSAHAAN,
                        'NILAI_KONTRAK' VALUE a.NILAI_KONTRAK,
                        'NO_KONTRAK' VALUE a.NO_KONTRAK,
                        'JUDUL_KONTRAK' VALUE a.JUDUL_KONTRAK,
                        'FLAG_REJECT' VALUE a.FLAG_REJECT,
                        'HARGA_NEGOSIASI' VALUE a.NILAI_KONTRAK)) DETAIL_VENDOR
    FROM N2N.D_PROJECT_VENDOR a
    LEFT JOIN N2N.M_VENDOR_PT b ON b.VENDOR_ID = a.VENDOR_ID
    WHERE
        a.FLAG_FINAL = 'T'
    GROUP BY a.PROJECT_ID) b ON b.PROJECT_ID = a.PROJECT_ID
LEFT JOIN (
    SELECT
        a.PROJECT_ID,
        SUM(a.NILAI_KONTRAK) AS NILAI_KONTRAK,
        JSON_ARRAYAGG(
            JSON_OBJECT('PROJECT_VENDOR_ID' VALUE a.PROJECT_VENDOR_ID,
                        'PROJECT_ID' VALUE a.PROJECT_ID,
                        'VENDOR_ID' VALUE a.VENDOR_ID,
                        'NAMA_VENDOR' VALUE b.NAMA_PERUSAHAAN,
                        'NILAI_KONTRAK' VALUE a.NILAI_KONTRAK,
                        'NO_KONTRAK' VALUE a.NO_KONTRAK,
                        'JUDUL_KONTRAK' VALUE a.JUDUL_KONTRAK,
                        'START_DATE' VALUE TO_CHAR(a.START_DATE, 'YYYY-MM-DD'),
                        'END_DATE' VALUE TO_CHAR(a.END_DATE, 'YYYY-MM-DD'),
                        'HARGA_NEGOSIASI' VALUE a.NILAI_KONTRAK)) DETAIL_VENDOR
    FROM N2N.D_PROJECT_VENDOR a
    LEFT JOIN N2N.M_VENDOR_PT b ON b.VENDOR_ID = a.VENDOR_ID
    WHERE
        a.FLAG_FINAL = 'Y'
    GROUP BY a.PROJECT_ID) c ON c.PROJECT_ID = a.PROJECT_ID
WHERE
    a.PROJECT_ID = :project_id;`

query.getProjectByType = `SELECT
    a.PROJECT_ID,
    a.PROJECT_ACTUAL_ID,
    a.PROJECT_NO,
    a.PROJECT_NO_OLD,
    a.PROJECT_NAME,
    a.CUSTOMER_ID,
    b.CUSTOMER_NAME,
    a.PORTOFOLIO_ID,
    c.PORTOFOLIO,
    a.PROJECT_TYPE_ID,
    a.PO_NUMBER,
    d.UR_REF as PROJECT_TYPE_NAME,
    CASE WHEN :type = 1 THEN '004' ELSE '003' END AS KD_STATUS 
FROM N2N.D_PROJECT a
LEFT JOIN N2N.M_CUSTOMER b ON b.CUSTOMER_ID = a.CUSTOMER_ID
LEFT JOIN N2N.M_PORTOFOLIO c ON c.PORTOFOLIO_ID = a.PORTOFOLIO_ID
LEFT JOIN N2N.M_REFERENSI d ON d.KD_REF = a.PROJECT_TYPE_ID AND d.JNS_REF = 'project_type_id'
WHERE
    a.PROJECT_TYPE_ID = :type :condition
AND
    a.KD_ARCHIVE is NULL
AND
    (upper(a.PROJECT_NO) like upper(:keyword) OR upper(a.PROJECT_NO_OLD) like upper(:keyword) OR upper(a.PROJECT_NAME) like upper(:keyword))
AND
    a.PROJECT_ACTUAL_ID IS NULL :condi2;`

query.getDataEkselerasi = `SELECT
    b.PROJECT_ID,
    b.PROJECT_NO,
    b.PROJECT_NAME,
    b.NILAI_PENAWARAN,
    b.PORTOFOLIO_ID,
    c.PORTOFOLIO,
    d.CUSTOMER_NAME,
    b.KD_AREA,
    e.UR_REF as NM_AREA,
    (SELECT
           JSON_ARRAYAGG(
               JSON_OBJECT('DOKUMEN_ID' VALUE a.DOKUMEN_ID,
                           'NO_DOKUMEN' VALUE a.NO_DOKUMEN,
                           'TIPE_DOKUMEN' VALUE a.TIPE_DOKUMEN,
                           'JNS_DOKUMEN' VALUE a.JNS_DOKUMEN,
                           'UR_TIPE_DOKUMEN' VALUE b.UR_REF,
                           'UR_JNS_DOKUMEN' VALUE c.UR_REF,
                           'URL_DOKUMEN' VALUE a.URL_DOKUMEN)
               ) as DOKUMEN
       FROM N2N.D_DOKUMEN a
       LEFT JOIN N2N.M_REFERENSI b ON b.KD_REF = a.JNS_DOKUMEN AND b.JNS_REF = 'jenis_dok'
       LEFT JOIN N2N.M_REFERENSI c ON c.KD_REF = a.TIPE_DOKUMEN AND c.JNS_REF = 'tipe_dok'
       WHERE
           a.PROJECT_ID = b.PROJECT_ID) AS DOKUMEN
FROM N2N.D_PROJECT a
LEFT JOIN N2N.D_PROJECT b ON b.PROJECT_ACTUAL_ID = a.PROJECT_ID
LEFT JOIN N2N.M_PORTOFOLIO c ON c.PORTOFOLIO_ID = b.PORTOFOLIO_ID
LEFT JOIN N2N.M_CUSTOMER d ON d.CUSTOMER_ID = b.CUSTOMER_ID
LEFT JOIN N2N.M_REFERENSI e ON e.KD_REF = b.KD_AREA AND e.JNS_REF = 'kd_area'
WHERE
    b.PROJECT_ACTUAL_ID = :project_id;`

query.getDetailVendorRealization = `SELECT 
	a.PROJECT_VENDOR_ID,
	a.PROJECT_ID,
	c.PROJECT_NO,
	c.PROJECT_NAME,
    c.PROJECT_KATEGORI_ID,
	a.VENDOR_ID,
	b.NAMA_PERUSAHAAN AS NAMA_VENDOR,
	a.NILAI_KONTRAK,
	a.NO_KONTRAK ,
	a.JUDUL_KONTRAK,
	TO_CHAR(a.START_DATE, 'YYYY-MM-DD') START_DATE,
	TO_CHAR(a.END_DATE, 'YYYY-MM-DD') END_DATE,
	a.FLAG_FINAL
FROM 	
	N2N.D_PROJECT_VENDOR a
LEFT JOIN N2N.M_VENDOR_PT b ON a.VENDOR_ID = b.VENDOR_ID  
LEFT JOIN N2N.D_PROJECT c ON a.PROJECT_ID = c.PROJECT_ID 
WHERE 
	a.PROJECT_VENDOR_ID = :project_vendor_id;`

query.getRemindd = `SELECT 
	a.* 
FROM 	
	N2N.D_REMIND a  
WHERE 
	a.PROJECT_ID = :project_vendor_id;`

query.getBillingRealization = ''

query.getDetailBilling = `
SELECT 
	a.*,
    b.COGS,
    b.NILAI_KONTRAK,
    b.PROJECT_NO,
    b.PROJECT_NAME,
    b.KATEGORI_REVENUE,
    mr1.UR_REF KATEGORI_REVENUE_UR,
    SUM(dpp.PERCENTAGE) OVER (PARTITION BY a.BILLING_ID)      AS T_PERCENTAGE,
    SUM(dpp.NILAI_PELAPORAN) OVER (PARTITION BY a.BILLING_ID) AS T_NILAI_PELAPORAN  
FROM 
	N2N.D_BILLING a LEFT JOIN N2N.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID 
    LEFT JOIN D_PROJECT_PROGRESS dpp ON a.BILLING_ID = dpp.BILLING_ID 
    LEFT JOIN N2N.M_REFERENSI mr1 ON mr1.KD_REF = b.KATEGORI_REVENUE AND mr1.JNS_REF = lower('kategori_revenue') 
WHERE 
	a.BILLING_ID = :billing_id ORDER BY a.TERMIN ASC;`

query.getBillingDocument = `
SELECT 
	a.DOKUMEN_ID,
	a.TIPE_DOKUMEN,
	a.JNS_DOKUMEN,
	c.UR_REF AS URAIAN_JENIS,
	c.UR_REF AS UR_JNS,
	a.NO_DOKUMEN,
	a.TGL_DOKUMEN,
	a.PERIHAL,
	CASE 
		WHEN a.URL_DOKUMEN IS NOT NULL THEN CONCAT('${LINK_DOK}', a.URL_DOKUMEN)
		ELSE a.URL_DOKUMEN
	END URL_DOKUMEN,
	a.NOTES,
    a.NAME_PEO,
	a.PROJECT_ID
FROM 
	N2N.D_BILLING_DOKUMEN d INNER JOIN 
	N2N.D_DOKUMEN a ON a.DOKUMEN_ID = d.DOKUMEN_ID 
LEFT JOIN N2N.M_REFERENSI c ON c.KD_REF = a.JNS_DOKUMEN AND c.JNS_REF = 'jenis_dok' 
WHERE 
	d.BILLING_ID = :billing_id AND a.JNS_DOKUMEN NOT IN ('01003', '01004', '08001', '01032') AND a.TIPE_DOKUMEN NOT IN ('06') ORDER BY a.TGL_DOKUMEN DESC;`

query.getBillingDocumentKeuangan = `
SELECT 
	a.DOKUMEN_ID,
	a.TIPE_DOKUMEN,
	a.JNS_DOKUMEN,
	c.UR_REF AS URAIAN_JENIS,
	c.UR_REF AS UR_JNS,
	a.NO_DOKUMEN,
	a.TGL_DOKUMEN,
	a.PERIHAL,
    a.FLAG_DELETE,
	CASE 
		WHEN SUBSTR(a.URL_DOKUMEN, 1, 5) = 'files' THEN CONCAT('${LINK_DOK}', a.URL_DOKUMEN)
		WHEN SUBSTR(a.URL_DOKUMEN, 1, 12) = '/sharefolder' THEN CONCAT('https://potter-cloud.ilcs.co.id', a.URL_DOKUMEN)
		ELSE a.URL_DOKUMEN
	END URL_DOKUMEN,
	a.NOTES,
	a.PROJECT_ID,
    a.NAME_PEO,
    a.FLAG_URL,
    CASE 
        WHEN a.JNS_DOKUMEN = '01004' 
            THEN ds.STAMP_ID 
        ELSE NULL 
    END AS STAMP_ID,
    CASE 
        WHEN a.JNS_DOKUMEN = '01004' 
            THEN ds.FLAG_UNSIGNED
        ELSE NULL 
    END AS FLAG_UNSIGNED,
    CASE 
        WHEN a.JNS_DOKUMEN = '01004' 
            THEN ds.FLAG_STAMP
        ELSE NULL 
    END AS FLAG_STAMP,
    CASE 
        WHEN a.JNS_DOKUMEN = '01004' 
            THEN ds.FLAG_SIGNED 
        ELSE NULL 
    END AS FLAG_SIGNED 
FROM 
    N2N.D_BILLING_DOKUMEN d INNER JOIN 
	N2N.D_DOKUMEN a ON a.DOKUMEN_ID = d.DOKUMEN_ID 
    LEFt JOIN D_STAMP ds ON ds.DOKUMEN_ID = a.DOKUMEN_ID 
LEFT JOIN N2N.M_REFERENSI c ON c.KD_REF = a.JNS_DOKUMEN AND c.JNS_REF = 'jenis_dok' 
WHERE 
	d.BILLING_ID = :billing_id AND (a.JNS_DOKUMEN IN ('01003', '01004', '01032') OR (a.JNS_DOKUMEN IN ('08001') AND a.FLAG_DELETE = 'F' AND a.URL_DOKUMEN IS NOT NULL)) ORDER BY a.TGL_DOKUMEN DESC;`

query.getBillingDocumentStamp = `
SELECT 
	a.DOKUMEN_ID,
	a.TIPE_DOKUMEN,
	a.JNS_DOKUMEN,
	c.UR_REF AS URAIAN_JENIS,
	c.UR_REF AS UR_JNS,
	a.NO_DOKUMEN,
	a.TGL_DOKUMEN,
	a.VALUE_DOK,
	CASE 
		WHEN a.URL_DOKUMEN IS NOT NULL AND a.FLAG_URL IS NULL THEN CONCAT('${LINK_DOK}', a.URL_DOKUMEN)
		ELSE a.URL_DOKUMEN
	END URL_DOKUMEN,
	a.NOTES,
	a.PROJECT_ID,
    a.NAME_PEO,
    a.FLAG_URL 
FROM 
    N2N.D_BILLING_DOKUMEN d INNER JOIN 
	N2N.D_DOKUMEN a ON a.DOKUMEN_ID = d.DOKUMEN_ID 
LEFT JOIN N2N.M_REFERENSI c ON c.KD_REF = a.JNS_DOKUMEN AND c.JNS_REF = 'jenis_dok' 
WHERE 
	d.BILLING_ID = :billing_id AND a.JNS_DOKUMEN IN ('01004') AND a.NOTES = 'Stamp' ORDER BY a.CREATED_AT ASC;`

query.getBillingDocumentPenagihan = `
SELECT 
	a.DOKUMEN_ID,
	a.TIPE_DOKUMEN,
	a.JNS_DOKUMEN,
	c.UR_REF AS URAIAN_JENIS,
	c.UR_REF AS UR_JNS,
	a.NO_DOKUMEN,
	a.TGL_DOKUMEN,
	a.PERIHAL,
	CASE 
		WHEN a.URL_DOKUMEN IS NOT NULL AND a.FLAG_URL IS NULL THEN CONCAT('${LINK_DOK}', a.URL_DOKUMEN)
		ELSE a.URL_DOKUMEN
	END URL_DOKUMEN,
	a.NOTES,
	a.PROJECT_ID,
    a.NAME_PEO,
    a.FLAG_URL 
FROM 
    N2N.D_BILLING_DOKUMEN d INNER JOIN 
	N2N.D_DOKUMEN a ON a.DOKUMEN_ID = d.DOKUMEN_ID 
LEFT JOIN N2N.M_REFERENSI c ON c.KD_REF = a.JNS_DOKUMEN AND c.JNS_REF = 'jenis_dok' 
WHERE 
	d.BILLING_ID = :billing_id AND c.SUB_KD_REF IN ('06') ORDER BY d.CREATED_AT ASC;`

query.getBillingDocumentPenagihanTambahan = `
SELECT 
	a.DOKUMEN_ID,
	a.TIPE_DOKUMEN,
	a.JNS_DOKUMEN,
	a.NO_DOKUMEN AS URAIAN_JENIS,
	a.NO_DOKUMEN AS UR_JNS,
	a.NO_DOKUMEN,
	a.TGL_DOKUMEN,
	CASE 
		WHEN a.URL_DOKUMEN IS NOT NULL AND a.FLAG_URL IS NULL THEN CONCAT('${LINK_DOK}', a.URL_DOKUMEN)
		ELSE a.URL_DOKUMEN
	END URL_DOKUMEN,
	a.NOTES,
	a.PROJECT_ID,
    a.NAME_PEO,
    a.FLAG_URL 
FROM 
    N2N.D_BILLING_DOKUMEN d INNER JOIN 
	N2N.D_DOKUMEN a ON a.DOKUMEN_ID = d.DOKUMEN_ID 
WHERE 
	d.BILLING_ID = :billing_id AND a.TIPE_DOKUMEN IN ('07') ORDER BY a.CREATED_AT ASC;`

query.getListBillingMonitoring = `
WITH LATEST_STATUS AS (
    SELECT PROJECT_ID,
           MAX(CASE WHEN KD_STATUS IN ('301','302','303','304','400','401','402','403')
                    THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
           MAX(CASE WHEN KD_STATUS='402' THEN TO_CHAR(DATE_STATUS,'YYYY-MM-DD') END) AS SLA_KD_START,
           MAX(CASE WHEN KD_STATUS='403' THEN TO_CHAR(DATE_STATUS,'YYYY-MM-DD') END) AS SLA_KD_END,
           MAX(CASE WHEN KD_STATUS='301' THEN TO_CHAR(DATE_STATUS,'YYYY-MM-DD') END) AS SLA_SUBMIT_START,
           MAX(CASE WHEN KD_STATUS='400' THEN TO_CHAR(DATE_STATUS,'YYYY-MM-DD') END) AS SLA_INVOICE_START,
           MAX(CASE WHEN KD_STATUS='401' THEN TO_CHAR(DATE_STATUS,'YYYY-MM-DD') END) AS SLA_PAID,
           MAX(CASE WHEN KD_STATUS='303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
           MAX(CASE WHEN KD_STATUS='302' THEN NOTES END) AS KETERANGAN_REJECT,
           MAX(CASE WHEN INSTR(CREATED_BY,'-')>0 THEN REGEXP_SUBSTR(CREATED_BY,'[^-]+',1,2)
                    ELSE CREATED_BY END) AS NAMA_DELIVERY
    FROM D_PROJECT_STATUS
    WHERE KD_STATUS IN ('301','302','303','304','400','401','402','403')
    GROUP BY PROJECT_ID
  ),
  LATEST_STATUS_ADJUSTMENT AS (
    SELECT PROJECT_ID,
           MAX(CASE WHEN KD_STATUS IN ('301','302','303','304','400','401','402','403')
                    THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
           MAX(CASE WHEN KD_STATUS='402' THEN TO_CHAR(DATE_STATUS,'YYYY-MM-DD') END) AS SLA_KD_START,
           MAX(CASE WHEN KD_STATUS='403' THEN TO_CHAR(DATE_STATUS,'YYYY-MM-DD') END) AS SLA_KD_END,
           MAX(CASE WHEN KD_STATUS='301' THEN TO_CHAR(DATE_STATUS,'YYYY-MM-DD') END) AS SLA_SUBMIT_START,
           MAX(CASE WHEN KD_STATUS='400' THEN TO_CHAR(DATE_STATUS,'YYYY-MM-DD') END) AS SLA_INVOICE_START,
           MAX(CASE WHEN KD_STATUS='401' THEN TO_CHAR(DATE_STATUS,'YYYY-MM-DD') END) AS SLA_PAID,
           MAX(CASE WHEN KD_STATUS='303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
           MAX(CASE WHEN KD_STATUS='302' THEN NOTES END) AS KETERANGAN_REJECT,
           MAX(CASE WHEN INSTR(CREATED_BY,'-')>0 THEN REGEXP_SUBSTR(CREATED_BY,'[^-]+',1,2)
                    ELSE CREATED_BY END) AS NAMA_DELIVERY
    FROM D_PROJECT_STATUS
    WHERE KD_STATUS IN ('301','302','303','304','400','401','402','403')
    GROUP BY PROJECT_ID
  ),
  STATUS_INVOICE AS (
    SELECT dps.PROJECT_ID, dps.DATE_STATUS
    FROM D_PROJECT_STATUS dps
    WHERE dps.KD_STATUS = '400'
  ),
  EXCLUDED_BILLINGS AS (
    SELECT A2.BILLING_ID
    FROM N2N.D_BILLING A2
    LEFT JOIN STATUS_INVOICE SI
           ON SI.PROJECT_ID = A2.BILLING_ID
    WHERE (
            (A2.FLAG_PARENT=1 AND A2.PARENT_ID IS NULL AND
               (SELECT COUNT(1) FROM D_BILLING db WHERE db.PARENT_ID=A2.BILLING_ID)=0)
         OR (A2.FLAG_PARENT=0 AND
               (SELECT COUNT(1) FROM D_BILLING db WHERE db.BILLING_ID=A2.PARENT_ID AND db.FLAG_PARENT=2)=0)
         OR  A2.FLAG_PARENT=2
          )
      AND REGEXP_LIKE(TO_CHAR(A2.REAL_BULAN_BILLING),'^(0?[1-9]|1[0-2])$')
      AND REGEXP_LIKE(TO_CHAR(A2.REAL_PERIODE_BILLING),'^[0-9]{4}$')
      AND (SELECT COUNT(1) FROM D_PROJECT_STATUS dpss
           WHERE dpss.PROJECT_ID=A2.BILLING_ID AND dpss.KD_STATUS='402') > 0
      AND A2.KD_STATUS IN ('400','405','401')
      AND TRUNC(SI.DATE_STATUS,'MM') <= TO_DATE(:month,'MM-YYYY')
      AND TO_DATE('01-'||LPAD(A2.REAL_BULAN_BILLING,2,0)||'-'||A2.REAL_PERIODE_BILLING,'DD-MM-YYYY')
          <= TO_DATE('01-'|| :month,'DD-MM-YYYY')
  ),
  cuspro_billing AS (
   -- /* ---- Bagian D_BILLING ---- */
    SELECT
      A.BILLING_ID,
      A.PROJECT_ID,
      B.PROJECT_NO,
      B.PROJECT_NAME,
      A.DIVISI_ID,
      C.CUSTOMER_NAME,
      C.KODE_AKUN,
      A.TERMIN,
      A.KD_STATUS,
      D.PORTOFOLIO,
      E.NAMA_DELIVERY,
      A.KETERANGAN,
      A.DESC_TERMIN,
      F.NO_INVOICE,
      CASE
        WHEN A.KD_STATUS='303' THEN 'Req. Faktur'
        WHEN A.KD_STATUS='302' THEN 'Rejected'
        WHEN A.KD_STATUS='301' THEN 'Sent'
        WHEN A.KD_STATUS='400' THEN 'Invoice'
        WHEN A.KD_STATUS='401' THEN 'Paid'
        WHEN A.KD_STATUS='402' THEN 'PYMAD'
        WHEN A.KD_STATUS='403' THEN 'Completed'
        ELSE '-' END AS STATUS,
      CASE WHEN A.KD_STATUS IN ('400','401','403') THEN 1 ELSE 0 END AS FLAG_REJECT,
      A.REAL_BILLING AS DPP,
      (A.REAL_BILLING * 11/100) AS PPN,
      A.REAL_BILLING + (A.REAL_BILLING * 11/100) AS JUMLAH_TAGIHAN,
      CASE
        WHEN F.STATUS_PELUNASAN='T' THEN TO_CHAR(F.TANGGAL_PELUNASAN,'DD/MM/YYYY')
        WHEN F.STATUS_INVOICE='T'   THEN TO_CHAR(F.TANGGAL_INVOICE,'DD/MM/YYYY')
        ELSE '-' END AS TANGGAL,
      TO_CHAR(B.MARGIN_PRESENTASE) || '%' AS "MARGIN_PRESENTASE",
      G.URAIAN AS "URAIAN_STATUS",
      E.LATEST_DATE_STATUS,
      TO_CHAR(E.LATEST_DATE_STATUS,'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
      TO_CHAR(LAST_DAY(TO_DATE('01-'||A.REAL_BULAN_BILLING||'-'||A.REAL_PERIODE_BILLING,'DD-MM-YYYY')),'DD-Mon-YYYY') AS TANGGAL_ACRUE,
     -- /* UMUR: last_day(:month) vs last_day(periode billing) */
      ABS(
        TRUNC(LAST_DAY(TO_DATE('01-'|| :month,'DD-MM-YYYY')))
        - TRUNC(LAST_DAY(TO_DATE('01-'||A.REAL_BULAN_BILLING||'-'||A.REAL_PERIODE_BILLING,'DD-MM-YYYY')))
      ) AS UMUR_PYMAD,
     -- /* Bucket umur */
      CASE WHEN ABS(TRUNC(LAST_DAY(TO_DATE('01-'|| :month,'DD-MM-YYYY'))) - TRUNC(LAST_DAY(TO_DATE('01-'||A.REAL_BULAN_BILLING||'-'||A.REAL_PERIODE_BILLING,'DD-MM-YYYY')))) BETWEEN 0 AND 30  THEN A.REAL_BILLING END AS "0-30 Hari",
      CASE WHEN ABS(TRUNC(LAST_DAY(TO_DATE('01-'|| :month,'DD-MM-YYYY'))) - TRUNC(LAST_DAY(TO_DATE('01-'||A.REAL_BULAN_BILLING||'-'||A.REAL_PERIODE_BILLING,'DD-MM-YYYY')))) BETWEEN 31 AND 60 THEN A.REAL_BILLING END AS "31-60 Hari",
      CASE WHEN ABS(TRUNC(LAST_DAY(TO_DATE('01-'|| :month,'DD-MM-YYYY'))) - TRUNC(LAST_DAY(TO_DATE('01-'||A.REAL_BULAN_BILLING||'-'||A.REAL_PERIODE_BILLING,'DD-MM-YYYY')))) BETWEEN 61 AND 90 THEN A.REAL_BILLING END AS "61-90 Hari",
      CASE WHEN ABS(TRUNC(LAST_DAY(TO_DATE('01-'|| :month,'DD-MM-YYYY'))) - TRUNC(LAST_DAY(TO_DATE('01-'||A.REAL_BULAN_BILLING||'-'||A.REAL_PERIODE_BILLING,'DD-MM-YYYY')))) > 90 THEN A.REAL_BILLING END AS "> 90 Hari",
      CASE WHEN F.NO_INVOICE IS NOT NULL THEN 'SUDAH INVOICE' ELSE 'BELUM INVOICE' END AS STATUS_INVOICES,
      TO_CHAR(TO_DATE(A.REAL_BULAN_BILLING||'-'||A.REAL_PERIODE_BILLING,'MM-YYYY'),'Mon-YYYY') AS PERIODE_PYMAD,
      B.KD_SPUC,
      E.KETERANGAN_REJECT,
      E.KETERANGAN_REQ_FAKTUR
    FROM N2N.D_BILLING A
    LEFT JOIN D_PROJECT B              ON B.PROJECT_ID   = A.PROJECT_ID
    LEFT JOIN N2N.M_CUSTOMER C         ON C.CUSTOMER_ID  = B.CUSTOMER_ID
    LEFT JOIN N2N.M_PORTOFOLIO D       ON D.PORTOFOLIO_ID= B.PORTOFOLIO_ID
    LEFT JOIN LATEST_STATUS E          ON E.PROJECT_ID   = A.BILLING_ID
    LEFT JOIN N2N.D_BILLING_REVENUE F  ON F.BILLING_ID   = A.BILLING_ID
    LEFT JOIN N2N.M_STATUS G           ON G.KD_STATUS    = A.KD_STATUS
                                       AND G.ID_TAB_STATUS IN ('FN1','DL1')
    WHERE (
            (A.FLAG_PARENT=1 AND A.PARENT_ID IS NULL AND (SELECT COUNT(1) FROM D_BILLING db WHERE db.PARENT_ID = A.BILLING_ID)=0)
         OR (A.FLAG_PARENT=0 AND (SELECT COUNT(1) FROM D_BILLING db WHERE db.BILLING_ID = A.PARENT_ID AND db.FLAG_PARENT=2)=0)
         OR  A.FLAG_PARENT=2
          )
      AND REGEXP_LIKE(TO_CHAR(A.REAL_BULAN_BILLING),'^(0?[1-9]|1[0-2])$')
      AND REGEXP_LIKE(TO_CHAR(A.REAL_PERIODE_BILLING),'^[0-9]{4}$')
      AND (SELECT COUNT(1) FROM D_PROJECT_STATUS dpss
           WHERE dpss.PROJECT_ID = A.BILLING_ID AND dpss.KD_STATUS='402') > 0
      AND ( LPAD(A.REAL_BULAN_BILLING,2,'0')||'-'||A.REAL_PERIODE_BILLING = :month
            OR TO_DATE('01-'||LPAD(A.REAL_BULAN_BILLING,2,0)||'-'||A.REAL_PERIODE_BILLING,'DD-MM-YYYY')
               < TO_DATE('01-'|| :month,'DD-MM-YYYY') )
      AND A.KD_STATUS NOT IN ('302')
     -- /* anti-join ke daftar exclude (tanpa nested WITH) */
      AND A.BILLING_ID NOT IN (SELECT BILLING_ID FROM EXCLUDED_BILLINGS)
      UNION
      SELECT
      A.BILLING_ID,
      A.PROJECT_ID,
      '' AS PROJECT_NO,
      A.PROJECT_NAME,
      '' AS DIVISI_ID,
      C.CUSTOMER_NAME,
      C.KODE_AKUN,
      '' AS TERMIN,
      A.KD_STATUS,
      '' AS PORTOFOLIO,
      '' AS NAMA_DELIVERY,
      A.KETERANGAN,
      A.KETERANGAN AS DESC_TERMIN,
      F.NO_INVOICE,
      CASE
        WHEN A.KD_STATUS='303' THEN 'Req. Faktur'
        WHEN A.KD_STATUS='302' THEN 'Rejected'
        WHEN A.KD_STATUS='301' THEN 'Sent'
        WHEN A.KD_STATUS='400' THEN 'Invoice'
        WHEN A.KD_STATUS='401' THEN 'Paid'
        WHEN A.KD_STATUS='402' THEN 'PYMAD'
        WHEN A.KD_STATUS='403' THEN 'Completed'
        ELSE '-' END AS STATUS,
      CASE WHEN A.KD_STATUS IN ('400','401','403') THEN 1 ELSE 0 END AS FLAG_REJECT,
      A.REAL_BILLING AS DPP,
      (A.REAL_BILLING * 11/100) AS PPN,
      A.REAL_BILLING + (A.REAL_BILLING * 11/100) AS JUMLAH_TAGIHAN,
      CASE
        WHEN F.STATUS_PELUNASAN='T' THEN TO_CHAR(F.TANGGAL_PELUNASAN,'DD/MM/YYYY')
        WHEN F.STATUS_INVOICE='T'   THEN TO_CHAR(F.TANGGAL_INVOICE,'DD/MM/YYYY')
        ELSE '-' END AS TANGGAL,
      '' AS "MARGIN_PRESENTASE",
      G.URAIAN AS "URAIAN_STATUS",
      E.LATEST_DATE_STATUS,
      TO_CHAR(E.LATEST_DATE_STATUS,'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
      TO_CHAR(LAST_DAY(TO_DATE('01-'||A.REAL_BULAN_BILLING||'-'||A.REAL_PERIODE_BILLING,'DD-MM-YYYY')),'DD-Mon-YYYY') AS TANGGAL_ACRUE,
      ABS(
        TRUNC(LAST_DAY(TO_DATE('01-'|| :month,'DD-MM-YYYY')))
        - TRUNC(LAST_DAY(TO_DATE('01-'||A.REAL_BULAN_BILLING||'-'||A.REAL_PERIODE_BILLING,'DD-MM-YYYY')))
      ) AS UMUR_PYMAD,
      CASE WHEN ABS(TRUNC(LAST_DAY(TO_DATE('01-'|| :month,'DD-MM-YYYY'))) - TRUNC(LAST_DAY(TO_DATE('01-'||A.REAL_BULAN_BILLING||'-'||A.REAL_PERIODE_BILLING,'DD-MM-YYYY')))) BETWEEN 0 AND 30  THEN A.REAL_BILLING END AS "0-30 Hari",
      CASE WHEN ABS(TRUNC(LAST_DAY(TO_DATE('01-'|| :month,'DD-MM-YYYY'))) - TRUNC(LAST_DAY(TO_DATE('01-'||A.REAL_BULAN_BILLING||'-'||A.REAL_PERIODE_BILLING,'DD-MM-YYYY')))) BETWEEN 31 AND 60 THEN A.REAL_BILLING END AS "31-60 Hari",
      CASE WHEN ABS(TRUNC(LAST_DAY(TO_DATE('01-'|| :month,'DD-MM-YYYY'))) - TRUNC(LAST_DAY(TO_DATE('01-'||A.REAL_BULAN_BILLING||'-'||A.REAL_PERIODE_BILLING,'DD-MM-YYYY')))) BETWEEN 61 AND 90 THEN A.REAL_BILLING END AS "61-90 Hari",
      CASE WHEN ABS(TRUNC(LAST_DAY(TO_DATE('01-'|| :month,'DD-MM-YYYY'))) - TRUNC(LAST_DAY(TO_DATE('01-'||A.REAL_BULAN_BILLING||'-'||A.REAL_PERIODE_BILLING,'DD-MM-YYYY')))) > 90 THEN A.REAL_BILLING END AS "> 90 Hari",
      CASE WHEN F.NO_INVOICE IS NOT NULL THEN 'SUDAH INVOICE' ELSE 'BELUM INVOICE' END AS STATUS_INVOICES,
      TO_CHAR(TO_DATE(A.REAL_BULAN_BILLING||'-'||A.REAL_PERIODE_BILLING,'MM-YYYY'),'Mon-YYYY') AS PERIODE_PYMAD,
      NULL AS KD_SPUC,
      E.KETERANGAN_REJECT,
      E.KETERANGAN_REQ_FAKTUR
    FROM N2N.D_BILLING_ADJUSTMENT A
    LEFT JOIN N2N.M_CUSTOMER C           ON C.CUSTOMER_ID = A.CUSTOMER_ID
    LEFT JOIN LATEST_STATUS_ADJUSTMENT E ON E.PROJECT_ID  = A.BILLING_ID
    LEFT JOIN N2N.D_BILLING_REVENUE F    ON F.BILLING_ID  = A.BILLING_ID
    LEFT JOIN N2N.M_STATUS G             ON G.KD_STATUS   = A.KD_STATUS
                                        AND G.ID_TAB_STATUS IN ('FN1','DL1')
    WHERE A.JNS_ADJUST = 'PYMAD'
      AND REGEXP_LIKE(TO_CHAR(A.REAL_BULAN_BILLING),'^(0?[1-9]|1[0-2])$')
      AND REGEXP_LIKE(TO_CHAR(A.REAL_PERIODE_BILLING),'^[0-9]{4}$')
      AND TO_DATE('01-'||LPAD(A.REAL_BULAN_BILLING,2,0)||'-'||A.REAL_PERIODE_BILLING,'DD-MM-YYYY')
          <= LAST_DAY(TO_DATE('01-'|| :month,'DD-MM-YYYY'))
  ),
  rekap_per_customer AS (
    SELECT
      CUSTOMER_NAME,
      KODE_AKUN,
      SUM(DPP)                AS JUMLAH_PYMAD,
      SUM("0-30 Hari")        AS umur_0_30,
      SUM("31-60 Hari")       AS umur_31_60,
      SUM("61-90 Hari")       AS umur_61_90,
      SUM("> 90 Hari")        AS umur_90_plus,
      SUM(CASE WHEN STATUS_INVOICES='SUDAH INVOICE' THEN DPP ELSE 0 END) AS NOMINAL,
      SUM(DPP) - SUM(CASE WHEN STATUS_INVOICES='SUDAH INVOICE' THEN DPP ELSE 0 END) AS SISA_PYMAD
    FROM cuspro_billing
    GROUP BY CUSTOMER_NAME, KODE_AKUN
  ),
  total_rekap AS (
    SELECT
      'Total' AS CUSTOMER_NAME,
      SUM(umur_0_30)    AS TOTAL_0_30,
      SUM(umur_31_60)   AS TOTAL_31_60,
      SUM(umur_61_90)   AS TOTAL_61_90,
      SUM(umur_90_plus) AS TOTAL_90_PLUS,
      SUM(SISA_PYMAD)   AS REKAP_SISA_PYMAD,
      SUM(JUMLAH_PYMAD) AS JUMLAH_PYMAD_TOTAL,
      SUM(NOMINAL)      AS REALISASI_NOMINAL
    FROM rekap_per_customer
  )
  SELECT a.*,
         b.*,
         (SELECT REALISASI_NOMINAL / NULLIF(JUMLAH_PYMAD_TOTAL,0) * 100 FROM total_rekap) AS REALISASI_PERSEN,
         (SELECT REALISASI_NOMINAL - JUMLAH_PYMAD_TOTAL FROM total_rekap) AS DEVIASI_NOMINAL,
         (SELECT (REALISASI_NOMINAL - JUMLAH_PYMAD_TOTAL) / NULLIF(JUMLAH_PYMAD_TOTAL,0) * 100 FROM total_rekap) AS DEVIASI_PERSEN
  FROM rekap_per_customer a
  CROSS JOIN total_rekap b
  ORDER BY a.KODE_AKUN;`

query.getListBillingMonitoringPiutang = `
WITH LATEST_STATUS AS (SELECT PROJECT_ID, 
    MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
    MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
    MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
    MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
    MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
    MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
    MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
    MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
    MAX(CASE
            WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
            ELSE CREATED_BY
        END)                                                                      AS NAMA_DELIVERY 
FROM D_PROJECT_STATUS
WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403') 
GROUP BY PROJECT_ID),
STATUS_INVOICE AS (
SELECT
    dps.DATE_STATUS, dps.PROJECT_ID 
FROM
    D_PROJECT_STATUS dps
WHERE
    dps.KD_STATUS = '400'),
cuspro_billing AS (
SELECT 
    A.BILLING_ID,
    A.PROJECT_ID,
    B.PROJECT_NO,
    B.PROJECT_NAME,
    A.DIVISI_ID,
    C.CUSTOMER_NAME,
    A.TERMIN,
    A.KD_STATUS,
    D.PORTOFOLIO,
    E.NAMA_DELIVERY,
    A.KETERANGAN,
    A.DESC_TERMIN,
    F.NO_INVOICE,
    CASE 
        WHEN A.KD_STATUS = '303' THEN 'Req. Faktur' 
        WHEN A.KD_STATUS = '302' THEN 'Rejected' 
        WHEN A.KD_STATUS = '301' THEN 'Sent' 
        WHEN A.KD_STATUS = '400' THEN 'Invoice' 
        WHEN A.KD_STATUS = '401' THEN 'Paid' 
        WHEN A.KD_STATUS = '402' THEN 'PYMAD' 
        WHEN A.KD_STATUS = '403' THEN 'Completed' 
    ELSE '-' END                         
    AS STATUS,
    CASE 
        WHEN A.KD_STATUS IN ('400', '401', '403') THEN 1 
    ELSE 0 END 
    AS FLAG_REJECT, 
    a.REAL_BILLING AS DPP,
    CASE
        WHEN F.STATUS_PELUNASAN = 'T' THEN to_char(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY')
        WHEN F.STATUS_INVOICE = 'T' THEN to_char(F.TANGGAL_INVOICE, 'DD/MM/YYYY')
    ELSE '-' END AS TANGGAL,
    CONCAT(to_char(b.MARGIN_PRESENTASE), '%') AS "MARGIN_PRESENTASE",
    G.URAIAN AS "URAIAN_STATUS",
    E.LATEST_DATE_STATUS,
    TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
    TO_CHAR(
        LAST_DAY(TO_DATE('01-' || A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY')),
        'DD-Mon-YYYY'
    ) AS TANGGAL_ACRUE,
    ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) AS UMUR_PYMAD,
    E.KETERANGAN_REJECT,
    CASE 
        WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) BETWEEN 0 AND 30 THEN a.REAL_BILLING
        ELSE NULL
    END AS "0-30 Hari",
    CASE 
        WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) BETWEEN 31 AND 60 THEN a.REAL_BILLING
        ELSE NULL
    END AS "31-60 Hari",
    CASE 
        WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) BETWEEN 61 AND 90 THEN a.REAL_BILLING
        ELSE NULL
    END AS "61-90 Hari",
    CASE 
        WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) > 90 THEN a.REAL_BILLING
        ELSE NULL
    END AS "> 90 Hari",
    CASE 
        WHEN a.KD_STATUS = '400' THEN 'Sudah Invoice'
        WHEN a.KD_STATUS = '401' THEN 'Sudah Invoice'
        ELSE 'Belum Invoice'
    END AS STATUS_INVOICE_DESC,
    (a.REAL_BILLING * 11/100) AS PPN,
    TO_CHAR(E.LATEST_DATE_STATUS, 'DD-Mon-YYYY') AS PERIODE_PYMAD,
    a.REAL_BILLING + (a.REAL_BILLING * 11/100) AS JUMLAH_TAGIHAN,
    b.KD_SPUC,
    f.NO_INVOICE,
    TO_CHAR(f.TANGGAL_INVOICE, 'DD-Mon-YYYY') AS TANGGAL_INVOICE,
    C.KODE_AKUN,
    CASE WHEN F.NO_INVOICE IS NOT NULL THEN 'SUDAH INVOICE' ELSE 'BELUM INVOICE' END AS STATUS_INVOICES,
    E.KETERANGAN_REQ_FAKTUR  
FROM N2N.D_BILLING A
LEFT JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ID
LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = B.CUSTOMER_ID
LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
LEFT JOIN N2N.M_STATUS G
ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1') 
    WHERE ((A.FLAG_PARENT = 1 AND A.PARENT_ID IS NULL AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.PARENT_ID = A.BILLING_ID) = 0) OR (A.FLAG_PARENT = 0 AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.BILLING_ID = A.PARENT_ID AND db.FLAG_PARENT = 2) = 0) OR A.FLAG_PARENT = 2) 
    AND REGEXP_LIKE(TO_CHAR(A.REAL_BULAN_BILLING), '^(0?[1-9]|1[0-2])$')
    AND REGEXP_LIKE(TO_CHAR(A.REAL_PERIODE_BILLING), '^[0-9]{4}$') 
    AND (SELECT COUNT(dpss.STATUS_ID) FROM D_PROJECT_STATUS dpss WHERE dpss.PROJECT_ID = A.BILLING_ID AND dpss.KD_STATUS = '400') > 0 
    AND (LPAD(A.REAL_BULAN_BILLING, 2, '0') || '-' || A.REAL_PERIODE_BILLING = :month OR TO_DATE('01-' || LPAD(A.REAL_BULAN_BILLING, 2, 0) || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY') < TO_DATE('01-' || :month, 'DD-MM-YYYY')) 
AND A.BILLING_ID NOT IN (
    SELECT A.BILLING_ID 
    FROM N2N.D_BILLING A
             LEFT JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ID
             LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = B.CUSTOMER_ID
             LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
             LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
             LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID 
             LEFT JOIN STATUS_INVOICE SI ON SI.PROJECT_ID = A.BILLING_ID 
             LEFT JOIN N2N.M_STATUS G
                       ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1') 
    WHERE ((A.FLAG_PARENT = 1 AND A.PARENT_ID IS NULL AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.PARENT_ID = A.BILLING_ID) = 0) OR (A.FLAG_PARENT = 0 AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.BILLING_ID = A.PARENT_ID AND db.FLAG_PARENT = 2) = 0) OR A.FLAG_PARENT = 2) 
    AND REGEXP_LIKE(TO_CHAR(A.REAL_BULAN_BILLING), '^(0?[1-9]|1[0-2])$')
    AND REGEXP_LIKE(TO_CHAR(A.REAL_PERIODE_BILLING), '^[0-9]{4}$') 
    AND (SELECT COUNT(dpss.STATUS_ID) FROM D_PROJECT_STATUS dpss WHERE dpss.PROJECT_ID = A.BILLING_ID AND dpss.KD_STATUS = '400') > 0 AND A.KD_STATUS IN ('400','401') 
    AND TRUNC(SI.DATE_STATUS, 'MM') <= TO_DATE(:month, 'MM-YYYY') 
    AND (TO_DATE('01-' || LPAD(A.REAL_BULAN_BILLING, 2, 0) || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY') <= TO_DATE('01-' || :month, 'DD-MM-YYYY'))
    )
    ORDER BY A.REAL_PERIODE_BILLING ASC, A.REAL_BULAN_BILLING),
    rekap_per_customer AS (
    SELECT 
        CUSTOMER_NAME,
        --MAX(KODE_AKUN),
        KODE_AKUN,
        SUM(DPP) AS JUMLAH_PYMAD,
        SUM("0-30 Hari") AS umur_0_30,
        SUM("31-60 Hari") AS umur_31_60,
        SUM("61-90 Hari") AS umur_61_90,
        SUM("> 90 Hari") AS umur_90_plus,
        SUM(CASE WHEN STATUS_INVOICES = 'SUDAH INVOICE' THEN DPP ELSE 0 END) AS NOMINAL,
        SUM(DPP) - SUM(CASE WHEN STATUS_INVOICES = 'SUDAH INVOICE' THEN DPP ELSE 0 END) AS SISA_PYMAD
    FROM cuspro_billing
    GROUP BY CUSTOMER_NAME, KODE_AKUN
), total_rekap AS (SELECT 
    'Total' AS CUSTOMER_NAME,
    SUM(umur_0_30) AS TOTAL_0_30,
    SUM(umur_31_60) AS TOTAL_31_60,
    SUM(umur_61_90) AS TOTAL_61_90,
    SUM(umur_90_plus)AS TOTAL_90_PLUS,
    SUM(sisa_pymad) AS REKAP_SISA_PYMAD,
    SUM(JUMLAH_PYMAD) JUMLAH_PYMAD_TOTAL,
   	SUM(NOMINAL) AS REALISASI_NOMINAL
FROM rekap_per_customer)
SELECT a.*, b.*, 
(SELECT REALISASI_NOMINAL / JUMLAH_PYMAD_TOTAL * 100 FROM total_rekap) AS REALISASI_PERSEN,
(SELECT REALISASI_NOMINAL - JUMLAH_PYMAD_TOTAL FROM total_rekap) AS DEVIASI_NOMINAL,
(SELECT (REALISASI_NOMINAL - JUMLAH_PYMAD_TOTAL)/JUMLAH_PYMAD_TOTAL*100 FROM total_rekap) AS DEVIASI_PERSEN
FROM rekap_per_customer a JOIN total_rekap b ON 1=1 ORDER BY KODE_AKUN;`


query.getListBillingMonitoringPiutang2 = `
WITH LATEST_STATUS AS (
    SELECT 
        PROJECT_ID,
        MAX(CASE WHEN KD_STATUS IN ('301','302','303','304','400','401','402','403') 
            THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
        MAX(CASE WHEN KD_STATUS='402' THEN TO_CHAR(DATE_STATUS,'YYYY-MM-DD') END) SLA_KD_START,
        MAX(CASE WHEN KD_STATUS='403' THEN TO_CHAR(DATE_STATUS,'YYYY-MM-DD') END) SLA_KD_END,
        MAX(CASE WHEN KD_STATUS='301' THEN TO_CHAR(DATE_STATUS,'YYYY-MM-DD') END) SLA_SUBMIT_START,
        MAX(CASE WHEN KD_STATUS='400' THEN TO_CHAR(DATE_STATUS,'YYYY-MM-DD') END) SLA_INVOICE_START,
        MAX(CASE WHEN KD_STATUS='401' THEN TO_CHAR(DATE_STATUS,'YYYY-MM-DD') END) SLA_PAID,
        MAX(CASE WHEN KD_STATUS='303' THEN NOTES END) KETERANGAN_REQ_FAKTUR,
        MAX(CASE WHEN KD_STATUS='302' THEN NOTES END) KETERANGAN_REJECT,
        MAX(
            CASE
                WHEN INSTR(CREATED_BY,'-')>0 
                THEN REGEXP_SUBSTR(CREATED_BY,'[^-]+',1,2)
                ELSE CREATED_BY
            END
        ) AS NAMA_DELIVERY
    FROM D_PROJECT_STATUS
    WHERE KD_STATUS IN ('301','302','303','304','400','401','402','403')
    GROUP BY PROJECT_ID
),
cuspro_billing AS (
SELECT
    A.BILLING_ID,
    A.PROJECT_ID,
    B.PROJECT_NO,
    B.PROJECT_NAME,
    A.DIVISI_ID,
    C.CUSTOMER_NAME,
    C.KODE_AKUN,
    A.TERMIN,
    A.KD_STATUS,
    D.PORTOFOLIO,
    E.NAMA_DELIVERY,
    A.KETERANGAN,
    A.DESC_TERMIN,
    F.NO_INVOICE,
    NVL(F.NOMINAL_DPP,0) AS DPP,
    CASE 
        WHEN F.WAPU = 'X' THEN F.NOMINAL_INVOICE
        WHEN C.WAPU = 'Y' THEN F.NOMINAL_DPP 
        ELSE (F.NOMINAL_DPP + F.PPN_TARIF) 
        END 
    AS NOMINAL_INVOICE,
    CASE 
        WHEN A.KD_STATUS='303' THEN 'Req. Faktur'
        WHEN A.KD_STATUS='302' THEN 'Rejected'
        WHEN A.KD_STATUS='301' THEN 'Sent'
        WHEN A.KD_STATUS='400' THEN 'Invoice'
        WHEN A.KD_STATUS='401' THEN 'Paid'
        WHEN A.KD_STATUS='402' THEN 'PYMAD'
        WHEN A.KD_STATUS='403' THEN 'Completed'
        ELSE '-'
    END AS STATUS,
    E.LATEST_DATE_STATUS,
    ABS(
        TRUNC(LAST_DAY(SYSDATE)) -
        TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))
    ) AS UMUR_PYMAD,
    CASE 
        WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) 
        BETWEEN 0 AND 30
        THEN NVL(F.NOMINAL_DPP,0)
    END AS "0-30 Hari",
    CASE 
        WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) 
        BETWEEN 31 AND 60
        THEN NVL(F.NOMINAL_DPP,0)
    END AS "31-60 Hari",
    CASE 
        WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) 
        BETWEEN 61 AND 90
        THEN NVL(F.NOMINAL_DPP,0)
    END AS "61-90 Hari",
    CASE 
        WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) 
        > 90
        THEN NVL(F.NOMINAL_DPP,0)
    END AS "> 90 Hari",
    CASE 
        WHEN F.NO_INVOICE IS NOT NULL 
        THEN 'SUDAH INVOICE'
        ELSE 'BELUM INVOICE'
    END STATUS_INVOICES
FROM N2N.D_BILLING A
LEFT JOIN D_PROJECT B
ON B.PROJECT_ID = A.PROJECT_ID
LEFT JOIN N2N.M_PORTOFOLIO D
ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
LEFT JOIN LATEST_STATUS E
ON E.PROJECT_ID = A.BILLING_ID
LEFT JOIN N2N.D_BILLING_REVENUE F
ON F.BILLING_ID = A.BILLING_ID
LEFT JOIN N2N.M_CUSTOMER C
ON C.CUSTOMER_ID = COALESCE(F.CUSTOMER_ID_TO_SAP,B.CUSTOMER_ID)
WHERE A.FLAG_PARENT IN (1,2)
AND (
    SELECT COUNT(dps.PROJECT_ID)
    FROM D_PROJECT_STATUS dps
    WHERE dps.KD_STATUS IN ('400','405')
    AND dps.PROJECT_ID = A.BILLING_ID
    AND (
        TO_CHAR(dps.DATE_STATUS,'MM-YYYY') = :month
        OR dps.DATE_STATUS < TO_DATE('01-' || :month, 'DD-MM-YYYY')
    )
) > 0
AND (
    SELECT COUNT(dps.PROJECT_ID)
    FROM D_PROJECT_STATUS dps
    WHERE dps.KD_STATUS='401'
    AND dps.PROJECT_ID = A.BILLING_ID
    AND (
        TO_CHAR(dps.DATE_STATUS,'MM-YYYY') = :month
        OR dps.DATE_STATUS < TO_DATE('01-' || :month, 'DD-MM-YYYY')
    )
) = 0
),
rekap_per_customer AS (
SELECT
    CUSTOMER_NAME,
    KODE_AKUN,
    SUM(DPP) NOMINAL,
    SUM("0-30 Hari") umur_0_30,
    SUM("31-60 Hari") umur_31_60,
    SUM("61-90 Hari") umur_61_90,
    SUM("> 90 Hari") umur_90_plus,
    SUM(NOMINAL_INVOICE) JUMLAH_PYMAD,
    SUM(NOMINAL_INVOICE) - SUM(DPP) SISA_PYMAD
FROM cuspro_billing
GROUP BY CUSTOMER_NAME,KODE_AKUN
),
total_rekap AS (
SELECT
    'Total' CUSTOMER_NAME,
    SUM(umur_0_30) TOTAL_0_30,
    SUM(umur_31_60) TOTAL_31_60,
    SUM(umur_61_90) TOTAL_61_90,
    SUM(umur_90_plus) TOTAL_90_PLUS,
    SUM(SISA_PYMAD) REKAP_SISA_PYMAD,
    SUM(JUMLAH_PYMAD) JUMLAH_PYMAD_TOTAL,
    SUM(NOMINAL) REALISASI_NOMINAL
FROM rekap_per_customer
)
SELECT
    a.*,
    b.*,
    (SELECT REALISASI_NOMINAL / JUMLAH_PYMAD_TOTAL * 100
     FROM total_rekap) REALISASI_PERSEN,
    (SELECT REALISASI_NOMINAL - JUMLAH_PYMAD_TOTAL
     FROM total_rekap) DEVIASI_NOMINAL,
    (SELECT
        (REALISASI_NOMINAL - JUMLAH_PYMAD_TOTAL)
        / JUMLAH_PYMAD_TOTAL * 100
     FROM total_rekap) DEVIASI_PERSEN
FROM rekap_per_customer a
JOIN total_rekap b ON 1=1
ORDER BY KODE_AKUN;`

query.getListBillingMonitoringPiutangNew = `
WITH WAKTU_ST AS (SELECT DISTINCT A.WAKTU_AKSI AS LATEST_DATE_STATUS,
                                  A.BILLING_ID,
                                  A.NO_REF,
                                  A.STATUS,
                                  ABS(
                                          TRUNC(LAST_DAY(TO_DATE('01-' || :month, 'DD-MM-YYYY'))) -
                                          TRUNC(LAST_DAY(A.WAKTU_AKSI))
                                  )            AS UMUR_PIUTANG
                  FROM D_SURAT_TAGIHAN_STATUS A
                           JOIN D_DOKUMEN B ON B.NO_REF = A.NO_REF AND B.FLAG_DELETE = 'F'
                  WHERE A.STATUS = 'Approve'),
     BILLING_PAID AS (SELECT dbr.BILLING_ID,
                             mc.WAPU,
                             mc.CUSTOMER_NAME,
                             CASE
                                 WHEN dbr.WAPU = 'X' THEN SUM(dbr.NOMINAL_INVOICE)
                                 WHEN mc.WAPU = 'Y' THEN SUM(dbr.NOMINAL_DPP)
                                 ELSE SUM((dbr.NOMINAL_DPP + dbr.PPN_TARIF))
                                 END
                                 AS NOMINAL_LUNAS,
                             mc.CUSTOMER_ID
                      FROM D_BILLING_REVENUE dbr
                               JOIN D_BILLING db ON db.BILLING_ID = dbr.BILLING_ID
                               JOIN D_PROJECT dp ON dp.PROJECT_ID = db.PROJECT_ID
                               LEFT JOIN N2N.M_CUSTOMER mc
                                         ON mc.CUSTOMER_ID = COALESCE(dbr.CUSTOMER_ID_TO_SAP, dp.CUSTOMER_ID)
                      WHERE EXISTS (SELECT DISTINCT dps.PROJECT_ID,
                                                    MIN(dps.DATE_STATUS)                     AS TANGGAL_401,
                                                    TO_CHAR(MIN(dps.DATE_STATUS), 'MM-YYYY') AS BULAN_401
                                    FROM D_PROJECT_STATUS dps
                                    WHERE dps.KD_STATUS = '401'
                                      AND dps.PROJECT_ID = dbr.BILLING_ID
                                      AND TO_CHAR(dps.DATE_STATUS, 'MM-YYYY') =
                                          TO_CHAR(ADD_MONTHS(TO_DATE('01-' || :month, 'DD-MM-YYYY'), 1),
                                                  'MM-YYYY') -- Langsung cocokkan format MM-YYYY
                                    GROUP BY dps.PROJECT_ID)
                      GROUP BY dbr.BILLING_ID, mc.WAPU, mc.CUSTOMER_NAME, mc.CUSTOMER_ID, dbr.WAPU),
     CUSPRO_BILLING AS (SELECT A.BILLING_ID,
                               A.PROJECT_ID,
                               B.PROJECT_NO,
                               B.PROJECT_NAME,
                               A.DIVISI_ID,
                               C.CUSTOMER_ID,
                               C.CUSTOMER_NAME,
                               C.KODE_AKUN,
                               A.TERMIN,
                               A.KD_STATUS,
                               D.PORTOFOLIO,
--                                E.NAMA_DELIVERY,
                               A.KETERANGAN,
                               A.DESC_TERMIN,
                               F.NO_INVOICE,
                               NVL(F.NOMINAL_DPP, 0) AS DPP,
                               CASE
                                   WHEN F.WAPU = 'X' THEN F.NOMINAL_INVOICE
                                   WHEN C.WAPU = 'Y' THEN F.NOMINAL_DPP
                                   ELSE (F.NOMINAL_DPP + F.PPN_TARIF)
                                   END
                                                     AS NOMINAL_INVOICE,
                               E.LATEST_DATE_STATUS,
                               E.UMUR_PIUTANG,
                               CASE
                                   WHEN E.UMUR_PIUTANG
                                       BETWEEN 0 AND 30
                                       THEN NVL(F.NOMINAL_DPP, 0)
                                   END               AS "0-30 Hari",
                               CASE
                                   WHEN E.UMUR_PIUTANG
                                       BETWEEN 31 AND 60
                                       THEN NVL(F.NOMINAL_DPP, 0)
                                   END               AS "31-60 Hari",
                               CASE
                                   WHEN E.UMUR_PIUTANG
                                       BETWEEN 61 AND 90
                                       THEN NVL(F.NOMINAL_DPP, 0)
                                   END               AS "61-90 Hari",
                               CASE
                                   WHEN E.UMUR_PIUTANG
                                       BETWEEN 91 AND 180
                                       THEN NVL(F.NOMINAL_DPP, 0)
                                   END               AS "91-180 Hari",
                               CASE
                                   WHEN E.UMUR_PIUTANG
                                       BETWEEN 181 AND 365
                                       THEN NVL(F.NOMINAL_DPP, 0)
                                   END               AS "181-365 Hari",
                               CASE
                                   WHEN E.UMUR_PIUTANG > 365
                                       THEN NVL(F.NOMINAL_DPP, 0)
                                   END               AS "> 365 Hari",
                               CASE
                                   WHEN F.NO_INVOICE IS NOT NULL
                                       THEN 'SUDAH INVOICE'
                                   ELSE 'BELUM INVOICE'
                                   END                  STATUS_INVOICES
                        FROM N2N.D_BILLING A
                                 LEFT JOIN D_PROJECT B
                                           ON B.PROJECT_ID = A.PROJECT_ID
                                 LEFT JOIN N2N.M_PORTOFOLIO D
                                           ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
                                 LEFT JOIN WAKTU_ST E
                                           ON E.BILLING_ID = A.BILLING_ID
                                 LEFT JOIN N2N.D_BILLING_REVENUE F
                                           ON F.BILLING_ID = A.BILLING_ID
                                 LEFT JOIN N2N.M_CUSTOMER C
                                           ON C.CUSTOMER_ID = COALESCE(F.CUSTOMER_ID_TO_SAP, B.CUSTOMER_ID)
                        WHERE A.FLAG_PARENT IN (1, 2)
                          AND EXISTS (SELECT 1
                                      FROM D_PROJECT_STATUS dps
                                      WHERE dps.KD_STATUS IN ('400', '405')
                                        AND dps.PROJECT_ID = A.BILLING_ID -- Perbaiki ini!
                                        AND (
                                          TO_CHAR(dps.DATE_STATUS, 'MM-YYYY') = :month
                                              OR dps.DATE_STATUS < TO_DATE('01-' || :month, 'DD-MM-YYYY')
                                          ))
                          AND NOT EXISTS (SELECT 1
                                          FROM D_PROJECT_STATUS dps
                                          WHERE dps.KD_STATUS = '401'
                                            AND dps.PROJECT_ID = A.BILLING_ID -- Perbaiki ini!
                                            AND (
                                              TO_CHAR(dps.DATE_STATUS, 'MM-YYYY') = :month
                                                  OR dps.DATE_STATUS < TO_DATE('01-' || :month, 'DD-MM-YYYY')
                                              ))),
     PAID_AGG AS (SELECT CUSTOMER_NAME,
                         SUM(NVL(NOMINAL_LUNAS, 0)) AS TOTAL_LUNAS
                  FROM BILLING_PAID
                  GROUP BY CUSTOMER_NAME),
     REKAP_PER_CUSTOMER AS (SELECT A.CUSTOMER_NAME,
                                   A.KODE_AKUN,
                                   SUM(A.DPP)                          AS NOMINAL,
                                   SUM(A."0-30 Hari")                  AS umur_0_30,
                                   SUM(A."31-60 Hari")                 AS umur_31_60,
                                   SUM(A."61-90 Hari")                 AS umur_61_90,
                                   SUM(A."91-180 Hari")                AS umur_91_180,
                                   SUM(A."181-365 Hari")               AS umur_181_365,
                                   SUM(A."> 365 Hari")                 AS umur_365_plus,
                                   SUM(A.NOMINAL_INVOICE)              AS JUMLAH_PYMAD,
                                   SUM(A.NOMINAL_INVOICE) - SUM(A.DPP) AS SISA_PYMAD,
                                   P.TOTAL_LUNAS                       AS NOMINAL_LUNAS
                            FROM CUSPRO_BILLING A
                                     LEFT JOIN PAID_AGG P ON P.CUSTOMER_NAME = A.CUSTOMER_NAME
                            GROUP BY A.CUSTOMER_NAME, A.KODE_AKUN, P.TOTAL_LUNAS),
     TOTAL_REKAP AS (SELECT 'Total'                                                                 AS CUSTOMER_NAME,
                            SUM(umur_0_30)                                                          AS TOTAL_0_30,
                            SUM(umur_31_60)                                                         AS TOTAL_31_60,
                            SUM(umur_61_90)                                                         AS TOTAL_61_90,
                            SUM(umur_91_180)                                                        AS TOTAL_91_180,
                            SUM(umur_181_365)                                                       AS TOTAL_181_365,
                            SUM(umur_365_plus)                                                      AS TOTAL_365_PLUS,
                            SUM(SISA_PYMAD)                                                         AS REKAP_SISA_PYMAD,
                            SUM(JUMLAH_PYMAD)                                                       AS JUMLAH_PYMAD_TOTAL,
                            -- ... kolom lainnya ...
                            SUM(NOMINAL)                                                            AS REALISASI_NOMINAL,
                            COALESCE(SUM(NOMINAL_LUNAS), 0)                                         AS TOTAL_LUNAS,
                            -- Hitung di sini
                            ROUND(COALESCE(SUM(NOMINAL_LUNAS), 0) / SUM(NOMINAL) * 100, 2)          AS LUNAS_PERSEN,
                            ROUND(SUM(NOMINAL) / NULLIF(SUM(JUMLAH_PYMAD), 0) * 100, 2)             AS REALISASI_PERSEN,
                            (SUM(JUMLAH_PYMAD) - COALESCE(SUM(NOMINAL_LUNAS), 0))                                        AS DEVIASI_NOMINAL,
                            ROUND((SUM(JUMLAH_PYMAD) - COALESCE(SUM(NOMINAL_LUNAS), 0)) / NULLIF(SUM(JUMLAH_PYMAD), 0) * 100, 2) AS DEVIASI_PERSEN
                     FROM REKAP_PER_CUSTOMER)
SELECT a.*,
       b.*
FROM REKAP_PER_CUSTOMER a
         CROSS JOIN TOTAL_REKAP b -- CROSS JOIN lebih tepat dari JOIN 1=1
ORDER BY a.KODE_AKUN;`


query.getListDetailBillingMonitoring = `
WITH RankedProgress AS (
    SELECT
        p.*,
        ROW_NUMBER() OVER (PARTITION BY PROJECT_ID ORDER BY CREATED_AT DESC) AS rn
    FROM D_PROJECT_PROGRESS p
),
LATEST_STATUS AS (
    SELECT 
        PROJECT_ID, 
        MAX(CASE WHEN KD_STATUS IN ('301','302','303','304','400','401','402','403') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
        MAX(CASE WHEN KD_STATUS = '301' THEN DATE_STATUS END) AS TANGGAL_SUBMIT,
        MAX(CASE WHEN KD_STATUS = '403' THEN DATE_STATUS END) AS TANGGAL_COMPLETE,
        MAX(CASE WHEN KD_STATUS = '301' THEN 'SUBMITED' ELSE 'BELUM SUBMITED' END) AS STATUS_SUBMIT,
        MAX(CASE WHEN KD_STATUS = '403' THEN 'COMPLETE' ELSE 'BELUM COMPLETE' END) AS STATUS_COMPLETE,
        MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
        MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
        MAX(CASE WHEN INSTR(CREATED_BY,'-') > 0 THEN REGEXP_SUBSTR(CREATED_BY,'[^-]+',1,2) ELSE CREATED_BY END) AS NAMA_DELIVERY
    FROM D_PROJECT_STATUS
    WHERE KD_STATUS IN ('301','302','303','304','400','401','402','403')
    GROUP BY PROJECT_ID
),
LATEST_STATUS_ADJUSTMENT AS (
     SELECT 
        PROJECT_ID, 
        MAX(CASE WHEN KD_STATUS IN ('301','302','303','304','400','401','402','403') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
        MAX(CASE WHEN KD_STATUS = '301' THEN DATE_STATUS END) AS TANGGAL_SUBMIT,
        MAX(CASE WHEN KD_STATUS = '403' THEN DATE_STATUS END) AS TANGGAL_COMPLETE,
        MAX(CASE WHEN KD_STATUS = '301' THEN 'SUBMITED' ELSE 'BELUM SUBMITED' END) AS STATUS_SUBMIT,
        MAX(CASE WHEN KD_STATUS = '403' THEN 'COMPLETE' ELSE 'BELUM COMPLETE' END) AS STATUS_COMPLETE,
        MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
        MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
        MAX(CASE WHEN INSTR(CREATED_BY,'-') > 0 THEN REGEXP_SUBSTR(CREATED_BY,'[^-]+',1,2) ELSE CREATED_BY END) AS NAMA_DELIVERY
    FROM D_PROJECT_STATUS
    WHERE KD_STATUS IN ('301','302','303','304','400','401','402','403')
    GROUP BY PROJECT_ID
),
BillingsToExclude AS (
    SELECT A.BILLING_ID
    FROM N2N.D_BILLING A
    INNER JOIN D_PROJECT_STATUS dps_inv
        ON dps_inv.PROJECT_ID = A.BILLING_ID 
       AND dps_inv.KD_STATUS = '400'
    WHERE A.KD_STATUS IN ('400','405','401')
      AND TRUNC(dps_inv.DATE_STATUS, 'MM') <= TO_DATE(:month ,'MM-YYYY')
      AND TO_DATE(
            '01-' || LPAD(A.REAL_BULAN_BILLING,2,'0') || '-' || A.REAL_PERIODE_BILLING,
            'DD-MM-YYYY'
          ) <= TO_DATE('01-' || :month ,'DD-MM-YYYY')
)
SELECT Z.* FROM (
	SELECT
        E.STATUS_SUBMIT,
        TO_CHAR(E.TANGGAL_SUBMIT,'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_SUBMIT,
        E.STATUS_COMPLETE,
        TO_CHAR(E.TANGGAL_COMPLETE,'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_COMPLETE,
        A.BILLING_ID,
        A.PROJECT_ID,
        B.PROJECT_NO,
        B.PROJECT_NAME,
        A.DIVISI_ID,
        C.CUSTOMER_NAME,
        C.KODE_AKUN,
        A.TERMIN,
        A.KD_STATUS,
        D.PORTOFOLIO,
        E.NAMA_DELIVERY,
        A.KETERANGAN,
        A.DESC_TERMIN,
        CASE 
            WHEN A.KD_STATUS = '303' THEN 'Req. Faktur'
            WHEN A.KD_STATUS = '302' THEN 'Rejected'
            WHEN A.KD_STATUS = '301' THEN 'Sent'
            WHEN A.KD_STATUS = '400' THEN 'Invoice'
            WHEN A.KD_STATUS = '401' THEN 'Paid'
            WHEN A.KD_STATUS = '402' THEN 'PYMAD'
            WHEN A.KD_STATUS = '403' THEN 'Completed'
            ELSE '-'
        END AS STATUS,
        G.URAIAN AS "URAIAN_STATUS",
        H.REMARK,
        H.DOK_WEEKLY,
        H.CREATED_BY,
        TO_CHAR(H.DUE_DATE,'DD/MM/YYYY HH24:MI:SS')  AS DUE_DATE,
        TO_CHAR(H.CREATED_AT,'DD/MM/YYYY HH24:MI:SS') AS PROGRESS_CREATED_AT,
        E.LATEST_DATE_STATUS,
        TO_CHAR(E.LATEST_DATE_STATUS,'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
        E.KETERANGAN_REJECT,
        E.KETERANGAN_REQ_FAKTUR,
        A.REAL_BILLING AS DPP,
        A.REAL_BILLING + (A.REAL_BILLING * 11/100) AS JUMLAH_TAGIHAN,
        (A.REAL_BILLING * 11/100) AS PPN,
--        F.NO_INVOICE,
        TO_CHAR(F.TANGGAL_INVOICE,'DD-Mon-YYYY') AS TANGGAL_INVOICE,
        B.KD_SPUC,
        F.NO_INVOICE,
        TO_CHAR(F.TANGGAL_PELUNASAN,'DD-Mon-YYYY') AS TANGGAL_PELUNASAN,
        CASE WHEN F.STATUS_PELUNASAN = 'T' THEN 'LUNAS' ELSE 'BELUM LUNAS' END AS STATUS_PELUNASAN,
        CASE WHEN F.NO_INVOICE IS NOT NULL THEN 'SUDAH INVOICE' ELSE 'BELUM INVOICE' END AS STATUS_INVOICE,
        TO_CHAR(F.TANGGAL_POSTING,'DD-Mon-YYYY') AS TANGGAL_POSTING,
        B.MARGIN_PRESENTASE || '%' AS "MARGIN_PRESENTASE",
        TO_CHAR(LAST_DAY(TO_DATE('01-' || A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING,'DD-MM-YYYY')),'DD-Mon-YYYY') AS TANGGAL_ACRUE,
        TO_CHAR(TO_DATE(A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING,'MM-YYYY'),'Mon-YYYY') AS PERIODE_PYMAD,
        CASE WHEN F.NO_INVOICE IS NOT NULL THEN A.REAL_BILLING ELSE 0 END AS REALISASI_INVOICE,
        ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) AS UMUR_PYMAD,
        CASE WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) BETWEEN 0  AND 30 THEN A.REAL_BILLING END AS "0-30 Hari",
        CASE WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) BETWEEN 31 AND 60 THEN A.REAL_BILLING END AS "31-60 Hari",
        CASE WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) BETWEEN 61 AND 90 THEN A.REAL_BILLING END AS "61-90 Hari",
        CASE WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) > 90 THEN A.REAL_BILLING END AS "> 90 Hari",
        CASE WHEN A.KD_STATUS IN ('400','401','403') THEN 1 ELSE 0 END AS FLAG_REJECT,
        A.REAL_BILLING AS NOMINAL,
        A.REAL_BULAN_BILLING,
        A.REAL_PERIODE_BILLING,
        CASE
            WHEN F.STATUS_PELUNASAN = 'T' THEN TO_CHAR(F.TANGGAL_PELUNASAN,'DD/MM/YYYY')
            WHEN F.STATUS_INVOICE = 'T'   THEN TO_CHAR(F.TANGGAL_INVOICE,'DD/MM/YYYY')
            ELSE '-'
        END AS TANGGAL
    FROM N2N.D_BILLING A
    LEFT JOIN D_PROJECT B                 ON B.PROJECT_ID = A.PROJECT_ID
    LEFT JOIN N2N.M_CUSTOMER C            ON C.CUSTOMER_ID = B.CUSTOMER_ID
    LEFT JOIN N2N.M_PORTOFOLIO D          ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
    LEFT JOIN LATEST_STATUS E             ON E.PROJECT_ID   = A.BILLING_ID
    LEFT JOIN RankedProgress H            ON H.PROJECT_ID   = A.BILLING_ID AND H.rn = 1
    LEFT JOIN N2N.D_BILLING_REVENUE F     ON F.BILLING_ID   = A.BILLING_ID
    LEFT JOIN N2N.M_STATUS G              ON G.KD_STATUS    = A.KD_STATUS AND G.ID_TAB_STATUS IN ('FN1','DL1')
    LEFT JOIN BillingsToExclude to_exclude ON A.BILLING_ID  = to_exclude.BILLING_ID
    WHERE 
        (
            (A.FLAG_PARENT = 1 AND A.PARENT_ID IS NULL AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.PARENT_ID = A.BILLING_ID) = 0)
         OR (A.FLAG_PARENT = 0 AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.BILLING_ID = A.PARENT_ID AND db.FLAG_PARENT = 2) = 0)
         OR A.FLAG_PARENT = 2
        )
      AND REGEXP_LIKE(TO_CHAR(A.REAL_BULAN_BILLING),'^(0?[1-9]|1[0-2])$')
      AND REGEXP_LIKE(TO_CHAR(A.REAL_PERIODE_BILLING),'^[0-9]{4}$')
      AND (SELECT COUNT(dpss.STATUS_ID) FROM D_PROJECT_STATUS dpss WHERE dpss.PROJECT_ID = A.BILLING_ID AND dpss.KD_STATUS = '402') > 0
--      AND A.KD_STATUS IN ('400','405','401')
      AND (LPAD(A.REAL_BULAN_BILLING,2,'0') || '-' || A.REAL_PERIODE_BILLING = :month 
           OR TO_DATE('01-' || LPAD(A.REAL_BULAN_BILLING,2,'0') || '-' || A.REAL_PERIODE_BILLING,'DD-MM-YYYY')
              < TO_DATE('01-' || :month ,'DD-MM-YYYY'))
      AND A.KD_STATUS NOT IN ('302')
      AND to_exclude.BILLING_ID IS NULL :customer_name
      UNION
      SELECT
      	'' STATUS_SUBMIT,
        '' TANGGAL_SUBMIT,
        '' STATUS_COMPLETE,
        '' TANGGAL_COMPLETE,
        A.BILLING_ID,
        A.PROJECT_ID,
        '' PROJECT_NO,
        A.PROJECT_NAME,
        '' AS DIVISI_ID,
        C.CUSTOMER_NAME,
        '' AS KODE_AKUN,
        '' AS TERMIN,
        A.KD_STATUS,
        '' AS PORTOFOLIO,
        '' AS NAMA_DELIVERY,
        A.KETERANGAN,
        A.KETERANGAN AS DESC_TERMIN,
        CASE 
            WHEN A.KD_STATUS = '303' THEN 'Req. Faktur'
            WHEN A.KD_STATUS = '302' THEN 'Rejected'
            WHEN A.KD_STATUS = '301' THEN 'Sent'
            WHEN A.KD_STATUS = '400' THEN 'Invoice'
            WHEN A.KD_STATUS = '401' THEN 'Paid'
            WHEN A.KD_STATUS = '402' THEN 'PYMAD'
            WHEN A.KD_STATUS = '403' THEN 'Completed'
            ELSE '-'
        END AS STATUS,
        G.URAIAN AS "URAIAN_STATUS",
        NULL AS REMARK,
        NULL AS DOK_WEEKLY,
        NULL AS CREATED_BY,
        NULL AS DUE_DATE,
        NULL AS PROGRESS_CREATED_AT,
        E.LATEST_DATE_STATUS,
        TO_CHAR(E.LATEST_DATE_STATUS,'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
        E.KETERANGAN_REJECT,
        E.KETERANGAN_REQ_FAKTUR,
        A.REAL_BILLING AS DPP,
        A.REAL_BILLING + (A.REAL_BILLING * 11/100) AS JUMLAH_TAGIHAN,
        (A.REAL_BILLING * 11/100) AS PPN,
--        F.NO_INVOICE,
        TO_CHAR(F.TANGGAL_INVOICE,'DD-Mon-YYYY') AS TANGGAL_INVOICE,
        NULL AS KD_SPUC,
        F.NO_INVOICE,
        TO_CHAR(F.TANGGAL_PELUNASAN,'DD-Mon-YYYY') AS TANGGAL_PELUNASAN,
        CASE WHEN F.STATUS_PELUNASAN = 'T' THEN 'LUNAS' ELSE 'BELUM LUNAS' END AS STATUS_PELUNASAN,
        CASE WHEN F.NO_INVOICE IS NOT NULL THEN 'SUDAH INVOICE' ELSE 'BELUM INVOICE' END AS STATUS_INVOICE,
        TO_CHAR(F.TANGGAL_POSTING,'DD-Mon-YYYY') AS TANGGAL_POSTING,
        '' AS "MARGIN_PRESENTASE",
        TO_CHAR(LAST_DAY(TO_DATE('01-' || A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING,'DD-MM-YYYY')),'DD-Mon-YYYY') AS TANGGAL_ACRUE,
        TO_CHAR(TO_DATE(A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING,'MM-YYYY'),'Mon-YYYY') AS PERIODE_PYMAD,
        CASE WHEN F.NO_INVOICE IS NOT NULL THEN A.REAL_BILLING ELSE 0 END AS REALISASI_INVOICE,
        ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) AS UMUR_PYMAD,
        CASE WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) BETWEEN 0  AND 30 THEN A.REAL_BILLING END AS "0-30 Hari",
        CASE WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) BETWEEN 31 AND 60 THEN A.REAL_BILLING END AS "31-60 Hari",
        CASE WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) BETWEEN 61 AND 90 THEN A.REAL_BILLING END AS "61-90 Hari",
        CASE WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) > 90 THEN A.REAL_BILLING END AS "> 90 Hari",
        CASE WHEN A.KD_STATUS IN ('400','401','403') THEN 1 ELSE 0 END AS FLAG_REJECT,
        A.REAL_BILLING AS NOMINAL,
        A.REAL_BULAN_BILLING,
        A.REAL_PERIODE_BILLING,
        CASE
            WHEN F.STATUS_PELUNASAN = 'T' THEN TO_CHAR(F.TANGGAL_PELUNASAN,'DD/MM/YYYY')
            WHEN F.STATUS_INVOICE = 'T'   THEN TO_CHAR(F.TANGGAL_INVOICE,'DD/MM/YYYY')
            ELSE '-'
        END AS TANGGAL
    FROM N2N.D_BILLING_ADJUSTMENT A
    LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = A.CUSTOMER_ID
             LEFT JOIN LATEST_STATUS_ADJUSTMENT E ON E.PROJECT_ID = A.BILLING_ID
             LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
             LEFT JOIN N2N.M_STATUS G
                       ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1') 
            WHERE A.JNS_ADJUST = 'PYMAD' AND 
            REGEXP_LIKE(TO_CHAR(A.REAL_BULAN_BILLING), '^(0?[1-9]|1[0-2])$')
            AND REGEXP_LIKE(TO_CHAR(A.REAL_PERIODE_BILLING), '^[0-9]{4}$') 
            AND (TO_DATE('01-' || LPAD(A.REAL_BULAN_BILLING, 2, 0) || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY') <= LAST_DAY(TO_DATE('01-' || :month , 'DD-MM-YYYY'))) :customer_name
) Z ORDER BY 
    Z.KODE_AKUN ASC, 
    Z.UMUR_PYMAD DESC;
`

query.getSummaryMonitoring = `
WITH RankedProgress AS (
SELECT
	p.*,
	ROW_NUMBER() OVER (PARTITION BY PROJECT_ID
ORDER BY
	CREATED_AT DESC) AS rn
FROM
	D_PROJECT_PROGRESS p
),
WAKTU_ST AS (
SELECT
	DISTINCT A.WAKTU_AKSI AS LATEST_DATE_STATUS,
	A.BILLING_ID,
	A.NO_REF,
	A.STATUS,
	ABS(
                                          TRUNC(LAST_DAY(TO_DATE('01-' || :month, 'DD-MM-YYYY'))) -
                                          TRUNC(LAST_DAY(A.WAKTU_AKSI))
                                  ) AS UMUR_PIUTANG
FROM
	D_SURAT_TAGIHAN_STATUS A
JOIN D_DOKUMEN B ON
	B.NO_REF = A.NO_REF
	AND B.FLAG_DELETE = 'F'
WHERE
	A.STATUS = 'Approve')
SELECT
	SUM (
        CASE
		WHEN F.WAPU = 'X' THEN F.NOMINAL_INVOICE
		WHEN C.WAPU = 'Y' THEN F.NOMINAL_DPP
		ELSE (F.NOMINAL_DPP + F.PPN_TARIF)
	END
    ) AS JUMLAH_TAGIHAN
FROM
	N2N.D_BILLING A
LEFT JOIN D_PROJECT B ON
	B.PROJECT_ID = A.PROJECT_ID
LEFT JOIN WAKTU_ST E ON
	E.BILLING_ID = A.BILLING_ID
LEFT JOIN N2N.D_BILLING_REVENUE F ON
	F.BILLING_ID = A.BILLING_ID
LEFT JOIN N2N.M_CUSTOMER C ON
	C.CUSTOMER_ID = COALESCE(F.CUSTOMER_ID_TO_SAP, B.CUSTOMER_ID)
LEFT JOIN RankedProgress H ON
	H.PROJECT_ID = A.BILLING_ID
	AND H.rn = 1
WHERE
	1 = 1
	AND A.FLAG_PARENT IN (1, 2)
	AND (
	SELECT
		COUNT(dps.PROJECT_ID)
	FROM
		D_PROJECT_STATUS dps
	WHERE
		dps.KD_STATUS IN ('400', '405')
			AND dps.PROJECT_ID = A.BILLING_ID
			AND (TO_CHAR(dps.DATE_STATUS, 'MM-YYYY') = :month
				OR dps.DATE_STATUS < TO_DATE('01-' || :month, 'DD-MM-YYYY'))) > 0
	AND (
	SELECT
		COUNT(dps.PROJECT_ID)
	FROM
		D_PROJECT_STATUS dps
	WHERE
		dps.KD_STATUS = '401'
		AND dps.PROJECT_ID = A.BILLING_ID
		AND (TO_CHAR(dps.DATE_STATUS, 'MM-YYYY') = :month
			OR dps.DATE_STATUS < TO_DATE('01-' || :month, 'DD-MM-YYYY'))) = 0
	AND (
	SELECT
		TO_CHAR(DPS.DATE_STATUS, 'MMYYYY')
	FROM
		D_PROJECT_STATUS DPS
	WHERE
		DPS.KD_STATUS = '401'
		AND DPS.PROJECT_ID = A.BILLING_ID
	ORDER BY
		DPS.DATE_STATUS ASC 
            FETCH FIRST 1 ROWS ONLY
        ) = TO_CHAR(ADD_MONTHS(TRUNC(LAST_DAY(TO_DATE(:month, 'MM-YYYY'))), 1), 'MMYYYY')
ORDER BY
	C.KODE_AKUN ASC,
	A.TERMIN ASC;
`

query.getListDetailBillingMonitoringPiutang = `
WITH RankedProgress AS (
    SELECT
        p.*, -- Mengambil semua kolom dari D_PROJECT_PROGRESS
        ROW_NUMBER() OVER(PARTITION BY PROJECT_ID ORDER BY CREATED_AT DESC) as rn
    FROM
        D_PROJECT_PROGRESS p
),
LATEST_STATUS AS (
    SELECT 
        PROJECT_ID, 
        MAX(CASE WHEN KD_STATUS IN ('302', '303', '304', '400', '401', '402', '403') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
        MAX(CASE WHEN KD_STATUS IN ('301') THEN DATE_STATUS END) AS TANGGAL_SUBMIT,
        MAX(CASE WHEN KD_STATUS IN ('403') THEN DATE_STATUS END) AS TANGGAL_COMPLETE,
        MAX(CASE WHEN KD_STATUS = '301' THEN 'SUBMITED' ELSE 'BELUM SUBMITED' END) AS STATUS_SUBMIT,
        MAX(CASE WHEN KD_STATUS = '403' THEN 'COMPLETE' ELSE 'BELUM COMPLETE' END) AS STATUS_COMPLETE,
        MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
        MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
        MAX(CASE WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2) ELSE CREATED_BY END) AS NAMA_DELIVERY 
    FROM D_PROJECT_STATUS
    WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403') 
    GROUP BY PROJECT_ID
)
SELECT 
    E.STATUS_SUBMIT,    
    TO_CHAR(E.TANGGAL_SUBMIT, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_SUBMIT,
    A.BILLING_ID,
    A.PROJECT_ID,
    B.PROJECT_NO,
    B.PROJECT_NAME,
    A.DIVISI_ID,
    C.CUSTOMER_NAME,
    C.KODE_AKUN,
    A.TERMIN,
    A.KD_STATUS,
    D.PORTOFOLIO,
    E.NAMA_DELIVERY,
    A.KETERANGAN,
    A.DESC_TERMIN,
    CASE 
        WHEN A.KD_STATUS = '303' THEN 'Req. Faktur' 
        WHEN A.KD_STATUS = '302' THEN 'Rejected' 
        WHEN A.KD_STATUS = '301' THEN 'Sent' 
        WHEN A.KD_STATUS = '400' THEN 'Invoice' 
        WHEN A.KD_STATUS = '401' THEN 'Paid' 
        WHEN A.KD_STATUS = '402' THEN 'PYMAD' 
        WHEN A.KD_STATUS = '403' THEN 'Completed' 
        ELSE '-' 
    END AS STATUS,
    G.URAIAN AS "URAIAN_STATUS",
    H.REMARK,
    H.DOK_WEEKLY,
    H.CREATED_BY,
    TO_CHAR(H.DUE_DATE, 'DD/MM/YYYY HH24:MI:SS') AS DUE_DATE,
    TO_CHAR(H.CREATED_AT, 'DD/MM/YYYY HH24:MI:SS') AS PROGRESS_CREATED_AT,
    E.LATEST_DATE_STATUS,
    TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
    E.KETERANGAN_REJECT,
    E.KETERANGAN_REQ_FAKTUR,
    a.REAL_BILLING AS DPP2,
    F.NOMINAL_DPP AS DPP,
    CASE 
        WHEN F.WAPU = 'X' THEN F.NOMINAL_INVOICE
        WHEN C.WAPU = 'Y' THEN F.NOMINAL_DPP 
        ELSE (F.NOMINAL_DPP + F.PPN_TARIF) 
        END 
    AS JUMLAH_TAGIHAN,
    a.REAL_BILLING + (a.REAL_BILLING * 11/100) AS NOMINAL_INVOICE,
    (a.REAL_BILLING * 11/100) AS PPN,
    F.NO_INVOICE,
    TO_CHAR(f.TANGGAL_INVOICE, 'DD-Mon-YYYY') AS TANGGAL_INVOICE,
    b.KD_SPUC,
    TO_CHAR(F.TANGGAL_PELUNASAN, 'DD-Mon-YYYY') AS TANGGAL_PELUNASAN,
    CASE WHEN F.STATUS_PELUNASAN = 'T' THEN 'LUNAS' ELSE 'BELUM LUNAS' END AS STATUS_PELUNASAN,
    CASE WHEN A.KD_STATUS IN ('400', '401') THEN 'SUDAH INVOICE' ELSE 'BELUM INVOICE' END AS STATUS_INVOICE,
    TO_CHAR(f.TANGGAL_POSTING, 'DD-Mon-YYYY') AS TANGGAL_POSTING,
    b.MARGIN_PRESENTASE || '%' AS "MARGIN_PRESENTASE",
    CASE WHEN STATUS_INVOICE = 'SUDAH INVOICE' THEN a.REAL_BILLING ELSE 0 END AS REALISASI_INVOICE,
    ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) AS UMUR_PYMAD,
    CASE WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) BETWEEN 0 AND 30 THEN a.REAL_BILLING END AS "0-30 Hari",
    CASE WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) BETWEEN 31 AND 60 THEN a.REAL_BILLING END AS "31-60 Hari",
    CASE WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) BETWEEN 61 AND 90 THEN a.REAL_BILLING END AS "61-90 Hari",
    CASE WHEN ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) > 90 THEN a.REAL_BILLING END AS "> 90 Hari"
FROM 
    N2N.D_BILLING A
    LEFT JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ID
    LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = B.CUSTOMER_ID
    LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
    LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
    LEFT JOIN RankedProgress H ON H.PROJECT_ID = A.BILLING_ID AND H.rn = 1 
    LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
    LEFT JOIN N2N.M_STATUS G ON G.KD_STATUS = A.KD_STATUS AND G.ID_TAB_STATUS IN ('FN1', 'DL1')
WHERE 
A.FLAG_PARENT IN (1, 2) :customer_name
AND (SELECT COUNT(dps.PROJECT_ID) 
     FROM D_PROJECT_STATUS dps 
     WHERE dps.KD_STATUS IN ('400', '405') 
     AND dps.PROJECT_ID = A.BILLING_ID 
     AND (TO_CHAR(dps.DATE_STATUS, 'MM-YYYY') = :month 
          OR dps.DATE_STATUS < TO_DATE('01-' || :month, 'DD-MM-YYYY'))) > 0 
AND (SELECT COUNT(dps.PROJECT_ID) 
     FROM D_PROJECT_STATUS dps 
     WHERE dps.KD_STATUS = '401' 
     AND dps.PROJECT_ID = A.BILLING_ID 
     AND (TO_CHAR(dps.DATE_STATUS, 'MM-YYYY') = :month 
          OR dps.DATE_STATUS < TO_DATE('01-' || :month, 'DD-MM-YYYY'))) = 0
ORDER BY
    C.KODE_AKUN ASC, 
    UMUR_PYMAD DESC;
`

query.getListDetailBillingMonitoringPiutangNew = `
WITH RankedProgress AS (
    SELECT
        p.*,
        ROW_NUMBER() OVER (PARTITION BY PROJECT_ID ORDER BY CREATED_AT DESC) AS rn
    FROM D_PROJECT_PROGRESS p
),
WAKTU_ST AS (SELECT DISTINCT A.WAKTU_AKSI AS LATEST_DATE_STATUS,
                                  A.BILLING_ID,
                                  A.NO_REF,
                                  A.STATUS,
                                  ABS(
                                          TRUNC(LAST_DAY(TO_DATE('01-' || :month, 'DD-MM-YYYY'))) -
                                          TRUNC(LAST_DAY(A.WAKTU_AKSI))
                                  )            AS UMUR_PIUTANG
                  FROM D_SURAT_TAGIHAN_STATUS A
                           JOIN D_DOKUMEN B ON B.NO_REF = A.NO_REF AND B.FLAG_DELETE = 'F'
                  WHERE A.STATUS = 'Approve')
SELECT E.BILLING_ID,
    C.CUSTOMER_NAME,
    C.KODE_AKUN,
    B.KD_SPUC,
    A.DIVISI_ID,
    B.PROJECT_NO,
    B.PROJECT_NAME,
    A.TERMIN,
    A.DESC_TERMIN,
    H.REMARK,
    H.DOK_WEEKLY,
    H.CREATED_BY,
    TO_CHAR(H.DUE_DATE,'DD/MM/YYYY HH24:MI:SS')  AS DUE_DATE,
    TO_CHAR(H.CREATED_AT,'DD/MM/YYYY HH24:MI:SS') AS PROGRESS_CREATED_AT,
    TO_NUMBER(F.NOMINAL_DPP)                                               AS DPP,
    F.PPN_TARIF                                                            AS PPN,
    CASE
        WHEN F.WAPU = 'X' THEN F.NOMINAL_INVOICE
        WHEN C.WAPU = 'Y' THEN F.NOMINAL_DPP
        ELSE (F.NOMINAL_DPP + F.PPN_TARIF)
        END                                                                AS JUMLAH_TAGIHAN,
    CASE
        WHEN F.WAPU = 'X' THEN F.WAPU
        ELSE C.WAPU
        END                                                                AS JUMLAH_TAGIHAN,
    E.UMUR_PIUTANG,
    CASE
        WHEN F.NO_INVOICE IS NOT NULL THEN 'SUDAH INVOICE'
        ELSE 'BELUM INVOICE' END                                           AS STATUS_INVOICE,
    F.NO_INVOICE,
    TO_CHAR(F.TANGGAL_INVOICE, 'DD-MM-YYYY')                               AS TANGGAL_INVOICE,
    TO_CHAR(F.TANGGAL_POSTING, 'DD-MM-YYYY')                               AS TANGGAL_POSTING,
    CASE 
        WHEN (
            SELECT TO_CHAR(DPS.DATE_STATUS, 'MMYYYY') 
            FROM D_PROJECT_STATUS DPS 
            WHERE DPS.KD_STATUS = '401' AND DPS.PROJECT_ID = A.BILLING_ID 
            ORDER BY DPS.DATE_STATUS ASC 
            FETCH FIRST 1 ROWS ONLY
        ) = TO_CHAR(ADD_MONTHS(TRUNC(LAST_DAY(TO_DATE(:month, 'MM-YYYY'))), 1), 'MMYYYY') 
        THEN 'LUNAS' 
        ELSE 'BELUM LUNAS' 
    END AS STATUS_PELUNASAN,
    CASE 
        WHEN (
            SELECT TO_CHAR(DPS.DATE_STATUS, 'MMYYYY') 
            FROM D_PROJECT_STATUS DPS 
            WHERE DPS.KD_STATUS = '401' AND DPS.PROJECT_ID = A.BILLING_ID 
            ORDER BY DPS.DATE_STATUS ASC 
            FETCH FIRST 1 ROWS ONLY
        ) = TO_CHAR(ADD_MONTHS(TRUNC(LAST_DAY(TO_DATE(:month, 'MM-YYYY'))), 1), 'MMYYYY') 
        THEN TO_CHAR(
            (SELECT DPS.DATE_STATUS 
            FROM D_PROJECT_STATUS DPS 
            WHERE DPS.KD_STATUS = '401' AND DPS.PROJECT_ID = A.BILLING_ID 
            ORDER BY DPS.DATE_STATUS ASC 
            FETCH FIRST 1 ROWS ONLY), 'DD-Mon-YYYY'
        ) 
        ELSE NULL 
    END AS TANGGAL_PELUNASAN,
    --TO_CHAR(F.TANGGAL_PELUNASAN, 'DD-Mon-YYYY')                            AS TANGGAL_PELUNASAN,
    --CASE WHEN F.STATUS_PELUNASAN = 'T' THEN 'LUNAS' ELSE 'BELUM LUNAS' END AS STATUS_PELUNASAN,
    CASE
        WHEN E.UMUR_PIUTANG BETWEEN 0 AND 30 THEN NVL(F.NOMINAL_DPP, 0)
        END                                                                AS "0-30 Hari",
    CASE
        WHEN E.UMUR_PIUTANG BETWEEN 31 AND 60 THEN NVL(F.NOMINAL_DPP, 0)
        END                                                                AS "31-60 Hari",
    CASE
        WHEN E.UMUR_PIUTANG BETWEEN 61 AND 90 THEN NVL(F.NOMINAL_DPP, 0)
        END                                                                AS "61-90 Hari",
    CASE
        WHEN E.UMUR_PIUTANG BETWEEN 91 AND 180 THEN NVL(F.NOMINAL_DPP, 0)
        END                                                                AS "91-180 Hari",
    CASE
        WHEN E.UMUR_PIUTANG BETWEEN 181 AND 365 THEN NVL(F.NOMINAL_DPP, 0)
        END                                                                AS "181-365 Hari",
    CASE
        WHEN E.UMUR_PIUTANG > 365 THEN NVL(F.NOMINAL_DPP, 0)
        END                                                                AS "> 365 Hari"
FROM N2N.D_BILLING A
        LEFT JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ID
        LEFT JOIN WAKTU_ST E ON E.BILLING_ID = A.BILLING_ID
        LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
        LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = COALESCE(F.CUSTOMER_ID_TO_SAP, B.CUSTOMER_ID)
        LEFT JOIN RankedProgress H            ON H.PROJECT_ID   = A.BILLING_ID AND H.rn = 1
WHERE 1 = 1
    AND A.FLAG_PARENT IN (1, 2)
:customer_name
    AND (SELECT COUNT(dps.PROJECT_ID)
        FROM D_PROJECT_STATUS dps
        WHERE dps.KD_STATUS IN ('400', '405')
            AND dps.PROJECT_ID = A.BILLING_ID
            AND (TO_CHAR(dps.DATE_STATUS, 'MM-YYYY') = :month
            OR dps.DATE_STATUS < TO_DATE('01-' || :month, 'DD-MM-YYYY'))) > 0
    AND (SELECT COUNT(dps.PROJECT_ID)
        FROM D_PROJECT_STATUS dps
        WHERE dps.KD_STATUS = '401'
            AND dps.PROJECT_ID = A.BILLING_ID
            AND (TO_CHAR(dps.DATE_STATUS, 'MM-YYYY') = :month
            OR dps.DATE_STATUS < TO_DATE('01-' || :month, 'DD-MM-YYYY'))) = 0
ORDER BY C.KODE_AKUN ASC,
        A.TERMIN ASC;
`

// query.getListNoFaktur = `
// WITH P_PERCEPATAN
// AS (
// 	(
// 		SELECT A.*
// 		FROM D_PROJECT A
// 		WHERE A.PROJECT_TYPE_ID = '1'
// 			AND A.KD_STATUS IN ('005')
// 		)
// 	)
// 	,LATEST_STATUS AS (
// 	SELECT PROJECT_ID
// 		,MAX(CASE 
// 				WHEN KD_STATUS IN (
// 						'301'
// 						,'302'
// 						,'303'
// 						,'304'
// 						,'400'
// 						,'401'
// 						,'402'
// 						,'403'
// 						,'405'
// 						)
// 					THEN DATE_STATUS
// 				END) AS LATEST_DATE_STATUS
// 		,
// 		MAX(CASE 
// 				WHEN KD_STATUS = '402'
// 					THEN to_char(DATE_STATUS, 'YYYY-MM-DD')
// 				END) AS TGL_PYMAD
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '403'
// 					THEN to_char(DATE_STATUS, 'YYYY-MM-DD')
// 				END) AS TGL_COMPLETED
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '301'
// 					THEN to_char(DATE_STATUS, 'YYYY-MM-DD')
// 				END) AS TGL_SUBMIT
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '400'
// 					THEN to_char(DATE_STATUS, 'YYYY-MM-DD')
// 				END) AS TGL_INVOICE
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '401'
// 					THEN to_char(DATE_STATUS, 'YYYY-MM-DD')
// 				END) AS TGL_PAID
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '303'
// 					THEN NOTES
// 				END) AS KETERANGAN_REQ_FAKTUR
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '302'
// 					THEN NOTES
// 				END) AS KETERANGAN_REJECT
// 		,MAX(CASE 
// 				WHEN INSTR(CREATED_BY, '-') > 0
// 					THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
// 				ELSE CREATED_BY
// 				END) AS NAMA_DELIVERY
// 	FROM D_PROJECT_STATUS
// 	WHERE KD_STATUS IN (
// 			'301'
// 			,'302'
// 			,'303'
// 			,'304'
// 			,'400'
// 			,'401'
// 			,'402'
// 			,'403'
// 			,'405'
// 			)
// 	GROUP BY PROJECT_ID
// 	)
// 	,SURAT_TAGIHAN
// AS (
// 	SELECT a.NO_DOKUMEN
// 		,a.TGL_DOKUMEN
// 		,a.URL_DOKUMEN
// 		,a.FLAG_DELETE
// 		,a.JSON_DOK
// 		,a.NOTES
// 		,a.NO_REF
// 		,b.BILLING_ID
// 		,ROW_NUMBER() OVER (
// 			PARTITION BY b.BILLING_ID ORDER BY a.CREATED_AT DESC
// 			) AS RN
// 	FROM D_DOKUMEN a
// 	INNER JOIN D_BILLING_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID
// 	WHERE a.JNS_DOKUMEN = '08001'
// 	ORDER BY a.CREATED_AT DESC
// 	)
// SELECT A.BILLING_ID
// 	,A.PROJECT_ID
// 	,B.PROJECT_NO
// 	,SUBSTR(B.PROJECT_NO, INSTR(B.PROJECT_NO, '-') + 1) AS nomor_project_baru
// 	,ROUND(a.REAL_BILLING) AS NOMINAL
// 	,ROUND((a.REAL_BILLING * 11 / 100)) AS PPN
// 	,ROUND(a.REAL_BILLING + (a.REAL_BILLING * 11 / 100)) AS JUMLAH_TAGIHAN
// 	,CASE 
// 		WHEN A.KD_STATUS = '400'
// 			THEN 'INVOICE'
// 		WHEN A.KD_STATUS = '402'
// 			THEN 'PYMAD'
// 		WHEN A.KD_STATUS = '403'
// 			THEN 'COMPLETED'
// 		WHEN A.KD_STATUS = '405'
// 			THEN 'SURAT TAGIHAN'
// 		WHEN A.KD_STATUS = '301'
// 			THEN 'SUBMITED'
// 		ELSE '-'
// 		END AS STATUS
//     --,A.KD_STATUS as STATUS
// 	,A.DESC_TERMIN
//     ,TRIM(
//         REGEXP_REPLACE(
//           REPLACE(
//             REPLACE(
//               REGEXP_REPLACE(B.PROJECT_NAME, '[\r\n]+', ' '),
//               CHR(9),
//               ' '
//             ),
//             CHR(160),
//             ' '
//           ),
//           '[[:space:]]+',
//           ' '
//         )
//       ) AS PROJECT_NAME
// 	,A.DIVISI_ID
// 	,b.KD_SPUC
// 	,C.CUSTOMER_NAME
// 	,C.WAPU
// 	,C.TRADING_PARTNER
// 	,A.TERMIN
// 	,A.KD_STATUS
// 	,D.PORTOFOLIO
// 	,E.NAMA_DELIVERY
// 	,A.KETERANGAN
// 	,F.NO_INVOICE
// 	,CASE 
// 		WHEN A.KD_STATUS IN (
// 				'400'
// 				,'401'
// 				,'403'
// 				)
// 			THEN 1
// 		ELSE 0
// 		END AS FLAG_REJECT
// 	,CASE 
// 		WHEN F.STATUS_PELUNASAN = 'T'
// 			THEN to_char(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY')
// 		WHEN F.STATUS_INVOICE = 'T'
// 			THEN to_char(F.TANGGAL_INVOICE, 'DD/MM/YYYY')
// 		ELSE '-'
// 		END AS TANGGAL
// 	,E.LATEST_DATE_STATUS
// 	,TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS
// 	,F.NO_FAKTUR
//     ,F.FLAG_FAKTUR
// 	,A.BILLING_CODE
// 	,ROUND(A.REAL_BILLING * 11 / 100) AS AMOUNT_PPN
// 	,TO_CHAR(LAST_DAY(F.TANGGAL_POSTING), 'DD.MM.YYYY') AS LAST_POSTING
// 	,F.BILLING_REVENUE_ID
// 	,F.TANGGAL_FAKTUR
// 	,CASE 
// 		WHEN H.URL_DOKUMEN IS NOT NULL
// 			THEN 'Tersedia'
// 		ELSE 'Belum Tersedia'
// 		END AS STATUS_DOKUMEN
// 	,
//     :mm as JURNAL_PERIODE ,
//     TO_CHAR(LAST_DAY(TO_DATE(:yyyy || '-' || :mm ||'-01', 'YYYY-MM-DD')),'DD.MM.YYYY') AS LAST_DAY_MONTH,
// 	TO_CHAR(TO_DATE(A.REAL_PERIODE_BILLING || A.REAL_BULAN_BILLING, 'YYYYMM'), 'Mon YYYY', 'NLS_DATE_LANGUAGE=ENGLISH') AS REALISASI_BILLING
// FROM N2N.D_BILLING A
// INNER JOIN P_PERCEPATAN B ON B.PROJECT_ID = A.PROJECT_ID
// LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = B.CUSTOMER_ID
// LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
// LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
// LEFT JOIN SURAT_TAGIHAN ST ON ST.BILLING_ID = A.BILLING_ID
// 	AND ST.RN = 1
// LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
// LEFT JOIN N2N.M_STATUS G ON G.KD_STATUS = A.KD_STATUS
// 	AND (
// 		G.ID_TAB_STATUS = 'FN1'
// 		OR G.ID_TAB_STATUS = 'DL1'
// 		)
// LEFT JOIN N2N.D_DOKUMEN H ON H.NO_DOKUMEN = F.NO_FAKTUR
// LEFT JOIN N2N.M_STATUS G ON G.KD_STATUS = A.KD_STATUS
// 	AND (
// 		G.ID_TAB_STATUS = 'FN1'
// 		OR G.ID_TAB_STATUS = 'DL1'
// 		)
// LEFT JOIN (
// 	SELECT bl.PARENT_ID
// 		,JSON_ARRAYAGG(JSON_OBJECT('BILLING_ID' VALUE bl.BILLING_ID, 'PROJECT_ID' VALUE bl.PROJECT_ID, 'TERMIN' VALUE bl.TERMIN, 'DESC_TERMIN' VALUE bl.DESC_TERMIN, 'KETERANGAN' VALUE bl.KETERANGAN, 'EST_BILLING' VALUE bl.EST_BILLING, 'EST_BULAN_BILLING' VALUE bl.EST_BULAN_BILLING, 'EST_PERIODE_BILLING' VALUE bl.EST_PERIODE_BILLING, 'REAL_BILLING' VALUE bl.REAL_BILLING, 'REAL_BULAN_BILLING' VALUE bl.REAL_BULAN_BILLING, 'REAL_PERIODE_BILLING' VALUE bl.REAL_PERIODE_BILLING, 'STATUS_BILLING' VALUE CASE 
// 					WHEN bl.KD_STATUS = '304'
// 						THEN 'Faktur Done'
// 					WHEN bl.KD_STATUS = '303'
// 						THEN 'Req. Faktur'
// 					WHEN bl.KD_STATUS = '302'
// 						THEN 'Rejected'
// 					WHEN bl.KD_STATUS = '301'
// 						THEN 'Submitted'
// 					WHEN bl.KD_STATUS = '400'
// 						THEN 'Invoice'
// 					WHEN bl.KD_STATUS = '405'
// 						THEN 'Surat Tagihan'
// 					WHEN bl.KD_STATUS = '401'
// 						THEN 'Paid'
// 					WHEN bl.KD_STATUS = '402'
// 						THEN 'PYMAD'
// 					WHEN bl.KD_STATUS = '403'
// 						THEN 'Completed'
// 					ELSE '-'
// 					END) RETURNING CLOB) DETAIL_CHILD
// 	FROM N2N.D_BILLING bl
// 	GROUP BY bl.PARENT_ID
// 	) y ON y.PARENT_ID = A.BILLING_ID
// WHERE A.FLAG_PARENT IN (1,2)
// 	AND A.KD_STATUS NOT IN ('302') AND A.KD_STATUS IS NOT NULL :billingCondition :month :status :wajib_faktur :divisi :keyword :dokumen :kdStatusJurnal
// ORDER BY CASE 
// 		WHEN (
// 				SELECT FLAG_NEW_DOK
// 				FROM D_PROJECT_STATUS
// 				WHERE PROJECT_ID = A.BILLING_ID
// 				ORDER BY DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY
// 				) = 'T'
// 			THEN 2
// 		ELSE 1
// 		END DESC
// 	,E.LATEST_DATE_STATUS DESC OFFSET(:page - 1) * :limit ROWS 
// 	--,E.LATEST_DATE_STATUS DESC OFFSET(:page - 1) * :limit ROWS 
// FETCH NEXT :limit ROWS ONLY;
// `

query.getListNoFaktur = `
WITH PROJECT AS (SELECT A.PROJECT_ID,
                        A.PROJECT_NO,
                        A.PROJECT_NAME,
                        B.CUSTOMER_NAME,
                        A.KD_SPUC,
                        B.WAPU,
                        B.TRADING_PARTNER,
                        C.PORTOFOLIO
                 FROM D_PROJECT A
                          JOIN M_CUSTOMER B ON B.CUSTOMER_ID = A.CUSTOMER_ID
                 JOIN M_PORTOFOLIO C ON C.PORTOFOLIO_ID = A.PORTOFOLIO_ID
                 WHERE A.KD_STATUS = '005'
                   AND A.PROJECT_TYPE_ID = '1'),
     DOKUMEN_CTE AS (SELECT F.BILLING_ID,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '08001' THEN D.NO_DOKUMEN END)  AS NO_SURAT_TAGIHAN,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '08001' THEN D.TGL_DOKUMEN END) AS TGL_SURAT_TAGIHAN,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '01003' THEN D.NO_DOKUMEN END)  AS NO_FAKTUR_AWAL,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '01003' THEN D.TGL_DOKUMEN END) AS TGL_FAKTUR_AWAL,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '01032' THEN D.NO_DOKUMEN END)  AS NO_FAKTUR_PGNT,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '01032' THEN D.TGL_DOKUMEN END) AS TGL_FAKTUR_PGNT,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '01003' THEN D.TGL_DOKUMEN END) AS URL_FAKTUR_AWAL,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '01032' THEN D.NO_DOKUMEN END)  AS URL_FAKTUR_PGNT,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '04006' THEN D.NO_DOKUMEN END)  AS NO_BAST,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '04006' THEN D.TGL_DOKUMEN END) AS TGL_BAST,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '04009' THEN D.NO_DOKUMEN END)  AS NO_BAST_DRAFT,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '04009' THEN D.TGL_DOKUMEN END) AS TGL_BAST_DRAFT
                     FROM D_BILLING_DOKUMEN F
                              JOIN D_DOKUMEN D
                                   ON D.DOKUMEN_ID = F.DOKUMEN_ID
                     WHERE D.JNS_DOKUMEN IN ('08001', '01003', '04006', '04009')
                     GROUP BY F.BILLING_ID)
SELECT A.BILLING_ID,
        B.BILLING_REVENUE_ID,
       C.PROJECT_ID,
       C.PROJECT_NO,
       ROUND(A.REAL_BILLING)                                AS NOMINAL,
       ROUND((A.REAL_BILLING * 11) / 100)                   AS PPN,
       A.REAL_BILLING + ROUND((A.REAL_BILLING * 11) / 100)  AS JUMLAH_TAGIHAN,
       UPPER(D.URAIAN)                                      AS STATUS,
       A.DESC_TERMIN,
       TRIM(
               REGEXP_REPLACE(
                       REPLACE(
                               REPLACE(
                                       REGEXP_REPLACE(C.PROJECT_NAME, '[\r\n]+', ' '),
                                       CHR(9),
                                       ' '
                               ),
                               CHR(160),
                               ' '
                       ),
                       '[[:space:]]+',
                       ' '
               )
       )                                                    AS PROJECT_NAME,
       A.DIVISI_ID,
       C.KD_SPUC,
       C.CUSTOMER_NAME,
       C.WAPU,
       C.TRADING_PARTNER,
       A.TERMIN,
       A.KD_STATUS,
       C.PORTOFOLIO,
       A.KETERANGAN,
       A.BILLING_CODE,
       B.FLAG_FAKTUR,
       CASE
           WHEN B.NO_FAKTUR IS NULL THEN 'BELUM TERSEDIA'
           ELSE B.NO_FAKTUR END                             AS NO_FAKTUR,
       CASE
           WHEN B.TANGGAL_FAKTUR IS NULL THEN 'BELUM TERSEDIA'
           ELSE TO_CHAR(B.TANGGAL_FAKTUR, 'DD/MM/YYYY') END AS TANGGAL_FAKTUR,
       CASE
           WHEN B.NO_FAKTUR = DOK.NO_FAKTUR_PGNT AND DOK.URL_FAKTUR_PGNT IS NOT NULL THEN 'TERSEDIA'
           WHEN B.NO_FAKTUR = DOK.NO_FAKTUR_AWAL AND DOK.URL_FAKTUR_AWAL IS NOT NULL THEN 'TERSEDIA'
           ELSE 'BELUM TERSEDIA' END                        AS STATUS_DOKUMEN,
       TO_CHAR(TO_DATE(A.REAL_PERIODE_BILLING || A.REAL_BULAN_BILLING, 'YYYYMM'), 'Mon YYYY',
               'NLS_DATE_LANGUAGE=ENGLISH')                 AS REALISASI_BILLING
FROM D_BILLING A
         JOIN D_BILLING_REVENUE B ON B.BILLING_ID = A.BILLING_ID
         JOIN PROJECT C ON C.PROJECT_ID = A.PROJECT_ID
         LEFT JOIN DOKUMEN_CTE DOK
                   ON DOK.BILLING_ID = A.BILLING_ID
         JOIN M_STATUS D ON D.KD_STATUS = A.KD_STATUS
WHERE A.FLAG_PARENT IN (1,2)
        AND A.KD_STATUS NOT IN ('302') AND A.KD_STATUS IS NOT NULL :billingCondition :month :status :wajib_faktur :divisi :keyword :dokumen 
ORDER BY A.BILLING_CODE ASC OFFSET(:page - 1) * :limit ROWS 
FETCH NEXT :limit ROWS ONLY;
`;

// query.getListNoFakturJurnalPPN = `
// WITH P_PERCEPATAN
// AS (
// 	(
// 		SELECT A.*
// 		FROM D_PROJECT A
// 		WHERE A.PROJECT_TYPE_ID = '1'
// 			AND A.KD_STATUS IN ('005')
// 		)
// 	)
// 	,LATEST_STATUS AS (
// 	SELECT PROJECT_ID
// 		,MAX(CASE 
// 				WHEN KD_STATUS IN (
// 						'301'
// 						,'302'
// 						,'303'
// 						,'304'
// 						,'400'
// 						,'401'
// 						,'402'
// 						,'403'
// 						,'405'
// 						)
// 					THEN DATE_STATUS
// 				END) AS LATEST_DATE_STATUS
// 		,
// 		MAX(CASE 
// 				WHEN KD_STATUS = '402'
// 					THEN to_char(DATE_STATUS, 'YYYY-MM-DD')
// 				END) AS TGL_PYMAD
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '403'
// 					THEN to_char(DATE_STATUS, 'YYYY-MM-DD')
// 				END) AS TGL_COMPLETED
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '301'
// 					THEN to_char(DATE_STATUS, 'YYYY-MM-DD')
// 				END) AS TGL_SUBMIT
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '400'
// 					THEN to_char(DATE_STATUS, 'YYYY-MM-DD')
// 				END) AS TGL_INVOICE
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '401'
// 					THEN to_char(DATE_STATUS, 'YYYY-MM-DD')
// 				END) AS TGL_PAID
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '303'
// 					THEN NOTES
// 				END) AS KETERANGAN_REQ_FAKTUR
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '302'
// 					THEN NOTES
// 				END) AS KETERANGAN_REJECT
// 		,MAX(CASE 
// 				WHEN INSTR(CREATED_BY, '-') > 0
// 					THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
// 				ELSE CREATED_BY
// 				END) AS NAMA_DELIVERY
// 	FROM D_PROJECT_STATUS
// 	WHERE KD_STATUS IN (
// 			'301'
// 			,'302'
// 			,'303'
// 			,'304'
// 			,'400'
// 			,'401'
// 			,'402'
// 			,'403'
// 			,'405'
// 			)
// 	GROUP BY PROJECT_ID
// 	)
// 	,SURAT_TAGIHAN
// AS (
// 	SELECT a.NO_DOKUMEN
// 		,a.TGL_DOKUMEN
// 		,a.URL_DOKUMEN
// 		,a.FLAG_DELETE
// 		,a.JSON_DOK
// 		,a.NOTES
// 		,a.NO_REF
// 		,b.BILLING_ID
// 		,ROW_NUMBER() OVER (
// 			PARTITION BY b.BILLING_ID ORDER BY a.CREATED_AT DESC
// 			) AS RN
// 	FROM D_DOKUMEN a
// 	INNER JOIN D_BILLING_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID
// 	WHERE a.JNS_DOKUMEN = '08001'
// 	ORDER BY a.CREATED_AT DESC
// 	)
// SELECT A.BILLING_ID
// 	,A.PROJECT_ID
// 	,B.PROJECT_NO
// 	,SUBSTR(B.PROJECT_NO, INSTR(B.PROJECT_NO, '-') + 1) AS nomor_project_baru
// 	,ROUND(a.REAL_BILLING) AS NOMINAL
// 	,ROUND((a.REAL_BILLING * 11 / 100)) AS PPN
// 	,ROUND(a.REAL_BILLING + (a.REAL_BILLING * 11 / 100)) AS JUMLAH_TAGIHAN
// 	,CASE 
// 		WHEN A.KD_STATUS = '400'
// 			THEN 'INVOICE'
// 		WHEN A.KD_STATUS = '402'
// 			THEN 'PYMAD'
// 		WHEN A.KD_STATUS = '403'
// 			THEN 'COMPLETED'
// 		WHEN A.KD_STATUS = '405'
// 			THEN 'SURAT TAGIHAN'
// 		WHEN A.KD_STATUS = '301'
// 			THEN 'SUBMITED'
// 		ELSE '-'
// 		END AS STATUS
//     --,A.KD_STATUS as STATUS
// 	,A.DESC_TERMIN
// 	,B.PROJECT_NAME
// 	,A.DIVISI_ID
// 	,b.KD_SPUC
// 	,C.CUSTOMER_NAME
// 	,C.WAPU
// 	,C.TRADING_PARTNER
// 	,A.TERMIN
// 	,A.KD_STATUS
// 	,D.PORTOFOLIO
// 	,E.NAMA_DELIVERY
// 	,A.KETERANGAN
// 	,F.NO_INVOICE
// 	,CASE 
// 		WHEN A.KD_STATUS IN (
// 				'400'
// 				,'401'
// 				,'403'
// 				)
// 			THEN 1
// 		ELSE 0
// 		END AS FLAG_REJECT
// 	,CASE 
// 		WHEN F.STATUS_PELUNASAN = 'T'
// 			THEN to_char(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY')
// 		WHEN F.STATUS_INVOICE = 'T'
// 			THEN to_char(F.TANGGAL_INVOICE, 'DD/MM/YYYY')
// 		ELSE '-'
// 		END AS TANGGAL
// 	,E.LATEST_DATE_STATUS
// 	,TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS
// 	,F.NO_FAKTUR
//     ,F.FLAG_FAKTUR
// 	,A.BILLING_CODE
// 	,ROUND(A.REAL_BILLING * 11 / 100) AS AMOUNT_PPN
// 	,TO_CHAR(LAST_DAY(F.TANGGAL_POSTING), 'DD.MM.YYYY') AS LAST_POSTING
// 	,F.BILLING_REVENUE_ID
// 	,F.TANGGAL_FAKTUR
// 	,CASE 
// 		WHEN H.URL_DOKUMEN IS NOT NULL
// 			THEN 'Tersedia'
// 		ELSE 'Belum Tersedia'
// 		END AS STATUS_DOKUMEN
// 	,
//     :month as JURNAL_PERIODE ,
//     TO_CHAR(LAST_DAY(TO_DATE(:year || '-' || :month ||'-01', 'YYYY-MM-DD')),'DD.MM.YYYY') AS LAST_DAY_MONTH,
// 	TO_CHAR(TO_DATE(A.REAL_PERIODE_BILLING || A.REAL_BULAN_BILLING, 'YYYYMM'), 'Mon YYYY', 'NLS_DATE_LANGUAGE=ENGLISH') AS REALISASI_BILLING
// FROM N2N.D_BILLING A
// INNER JOIN P_PERCEPATAN B ON B.PROJECT_ID = A.PROJECT_ID
// LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = B.CUSTOMER_ID
// LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
// LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
// LEFT JOIN SURAT_TAGIHAN ST ON ST.BILLING_ID = A.BILLING_ID
// 	AND ST.RN = 1
// LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
// LEFT JOIN N2N.M_STATUS G ON G.KD_STATUS = A.KD_STATUS
// 	AND (
// 		G.ID_TAB_STATUS = 'FN1'
// 		OR G.ID_TAB_STATUS = 'DL1'
// 		)
// LEFT JOIN N2N.D_DOKUMEN H ON H.NO_DOKUMEN = F.NO_FAKTUR
// LEFT JOIN N2N.M_STATUS G ON G.KD_STATUS = A.KD_STATUS
// 	AND (
// 		G.ID_TAB_STATUS = 'FN1'
// 		OR G.ID_TAB_STATUS = 'DL1'
// 		)
// LEFT JOIN (
// 	SELECT bl.PARENT_ID
// 		,JSON_ARRAYAGG(JSON_OBJECT('BILLING_ID' VALUE bl.BILLING_ID, 'PROJECT_ID' VALUE bl.PROJECT_ID, 'TERMIN' VALUE bl.TERMIN, 'DESC_TERMIN' VALUE bl.DESC_TERMIN, 'KETERANGAN' VALUE bl.KETERANGAN, 'EST_BILLING' VALUE bl.EST_BILLING, 'EST_BULAN_BILLING' VALUE bl.EST_BULAN_BILLING, 'EST_PERIODE_BILLING' VALUE bl.EST_PERIODE_BILLING, 'REAL_BILLING' VALUE bl.REAL_BILLING, 'REAL_BULAN_BILLING' VALUE bl.REAL_BULAN_BILLING, 'REAL_PERIODE_BILLING' VALUE bl.REAL_PERIODE_BILLING, 'STATUS_BILLING' VALUE CASE 
// 					WHEN bl.KD_STATUS = '304'
// 						THEN 'Faktur Done'
// 					WHEN bl.KD_STATUS = '303'
// 						THEN 'Req. Faktur'
// 					WHEN bl.KD_STATUS = '302'
// 						THEN 'Rejected'
// 					WHEN bl.KD_STATUS = '301'
// 						THEN 'Submitted'
// 					WHEN bl.KD_STATUS = '400'
// 						THEN 'Invoice'
// 					WHEN bl.KD_STATUS = '405'
// 						THEN 'Surat Tagihan'
// 					WHEN bl.KD_STATUS = '401'
// 						THEN 'Paid'
// 					WHEN bl.KD_STATUS = '402'
// 						THEN 'PYMAD'
// 					WHEN bl.KD_STATUS = '403'
// 						THEN 'Completed'
// 					ELSE '-'
// 					END) RETURNING CLOB) DETAIL_CHILD
// 	FROM N2N.D_BILLING bl
// 	GROUP BY bl.PARENT_ID
// 	) y ON y.PARENT_ID = A.BILLING_ID
// WHERE A.FLAG_PARENT IN (1,2)
// 	AND A.KD_STATUS IN (
// 		'303'
// 		,'302'
// 		,'304'
// 		,'301'
// 		,'400'
// 		,'405'
// 		,'401'
// 		,'402'
// 		,'403'
// 		)
// 	AND A.KD_STATUS IN (
// 		'402'
// 		,'403'
// 		,'400'
// 		,'405'
//         ,'301'
// 		) :billingCondition :month :status :wajib_faktur :divisi :keyword :dokumen
// ORDER BY CASE 
// 		WHEN (
// 				SELECT FLAG_NEW_DOK
// 				FROM D_PROJECT_STATUS
// 				WHERE PROJECT_ID = A.BILLING_ID
// 				ORDER BY DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY
// 				) = 'T'
// 			THEN 2
// 		ELSE 1
// 		END DESC
// 	,E.LATEST_DATE_STATUS DESC OFFSET(:page - 1) * :limit ROWS 
// FETCH NEXT :limit ROWS ONLY;
// `


// query.countListNoFaktur = `
// WITH P_PERCEPATAN
// AS (
// 	(
// 		SELECT A.*
// 		FROM D_PROJECT A
// 		WHERE A.PROJECT_TYPE_ID = '1'
// 			AND A.KD_STATUS IN ('005')
// 		)
// 	)
// 	,LATEST_STATUS AS (
// 	SELECT PROJECT_ID
// 		,MAX(CASE 
// 				WHEN KD_STATUS IN (
// 						'301'
// 						,'302'
// 						,'303'
// 						,'304'
// 						,'400'
// 						,'401'
// 						,'402'
// 						,'403'
// 						,'405'
// 						)
// 					THEN DATE_STATUS
// 				END) AS LATEST_DATE_STATUS
// 		,
// 		MAX(CASE 
// 				WHEN KD_STATUS = '402'
// 					THEN to_char(DATE_STATUS, 'YYYY-MM-DD')
// 				END) AS TGL_PYMAD
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '403'
// 					THEN to_char(DATE_STATUS, 'YYYY-MM-DD')
// 				END) AS TGL_COMPLETED
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '301'
// 					THEN to_char(DATE_STATUS, 'YYYY-MM-DD')
// 				END) AS TGL_SUBMIT
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '400'
// 					THEN to_char(DATE_STATUS, 'YYYY-MM-DD')
// 				END) AS TGL_INVOICE
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '401'
// 					THEN to_char(DATE_STATUS, 'YYYY-MM-DD')
// 				END) AS TGL_PAID
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '303'
// 					THEN NOTES
// 				END) AS KETERANGAN_REQ_FAKTUR
// 		,MAX(CASE 
// 				WHEN KD_STATUS = '302'
// 					THEN NOTES
// 				END) AS KETERANGAN_REJECT
// 		,MAX(CASE 
// 				WHEN INSTR(CREATED_BY, '-') > 0
// 					THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
// 				ELSE CREATED_BY
// 				END) AS NAMA_DELIVERY
// 	FROM D_PROJECT_STATUS
// 	WHERE KD_STATUS IN (
// 			'301'
// 			,'302'
// 			,'303'
// 			,'304'
// 			,'400'
// 			,'401'
// 			,'402'
// 			,'403'
// 			,'405'
// 			)
// 	GROUP BY PROJECT_ID
// 	)
// 	,SURAT_TAGIHAN
// AS (
// 	SELECT a.NO_DOKUMEN
// 		,a.TGL_DOKUMEN
// 		,a.URL_DOKUMEN
// 		,a.FLAG_DELETE
// 		,a.JSON_DOK
// 		,a.NOTES
// 		,a.NO_REF
// 		,b.BILLING_ID
// 		,ROW_NUMBER() OVER (
// 			PARTITION BY b.BILLING_ID ORDER BY a.CREATED_AT DESC
// 			) AS RN
// 	FROM D_DOKUMEN a
// 	INNER JOIN D_BILLING_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID
// 	WHERE a.JNS_DOKUMEN = '08001'
// 	ORDER BY a.CREATED_AT DESC
// 	)
// SELECT 
//     count(A.BILLING_ID) AS "total_data",
//     :page AS "total_halaman",
//     :limit AS "limit"
//     FROM N2N.D_BILLING A
//     INNER JOIN P_PERCEPATAN B ON B.PROJECT_ID = A.PROJECT_ID
//     LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = B.CUSTOMER_ID
//     LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
//     LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
//     LEFT JOIN SURAT_TAGIHAN ST ON ST.BILLING_ID = A.BILLING_ID
//         AND ST.RN = 1
//     LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
//     LEFT JOIN N2N.M_STATUS G ON G.KD_STATUS = A.KD_STATUS
//         AND (
//             G.ID_TAB_STATUS = 'FN1'
//             OR G.ID_TAB_STATUS = 'DL1'
//             )
//     LEFT JOIN N2N.D_DOKUMEN H ON H.NO_DOKUMEN = F.NO_FAKTUR
//     LEFT JOIN N2N.M_STATUS G ON G.KD_STATUS = A.KD_STATUS
//         AND (
//             G.ID_TAB_STATUS = 'FN1'
//             OR G.ID_TAB_STATUS = 'DL1'
//             )
//     LEFT JOIN (
//         SELECT bl.PARENT_ID
//             ,JSON_ARRAYAGG(JSON_OBJECT('BILLING_ID' VALUE bl.BILLING_ID, 'PROJECT_ID' VALUE bl.PROJECT_ID, 'TERMIN' VALUE bl.TERMIN, 'DESC_TERMIN' VALUE bl.DESC_TERMIN, 'KETERANGAN' VALUE bl.KETERANGAN, 'EST_BILLING' VALUE bl.EST_BILLING, 'EST_BULAN_BILLING' VALUE bl.EST_BULAN_BILLING, 'EST_PERIODE_BILLING' VALUE bl.EST_PERIODE_BILLING, 'REAL_BILLING' VALUE bl.REAL_BILLING, 'REAL_BULAN_BILLING' VALUE bl.REAL_BULAN_BILLING, 'REAL_PERIODE_BILLING' VALUE bl.REAL_PERIODE_BILLING, 'STATUS_BILLING' VALUE CASE 
//                         WHEN bl.KD_STATUS = '304'
//                             THEN 'Faktur Done'
//                         WHEN bl.KD_STATUS = '303'
//                             THEN 'Req. Faktur'
//                         WHEN bl.KD_STATUS = '302'
//                             THEN 'Rejected'
//                         WHEN bl.KD_STATUS = '301'
//                             THEN 'Submitted'
//                         WHEN bl.KD_STATUS = '400'
//                             THEN 'Invoice'
//                         WHEN bl.KD_STATUS = '405'
//                             THEN 'Surat Tagihan'
//                         WHEN bl.KD_STATUS = '401'
//                             THEN 'Paid'
//                         WHEN bl.KD_STATUS = '402'
//                             THEN 'PYMAD'
//                         WHEN bl.KD_STATUS = '403'
//                             THEN 'Completed'
//                         ELSE '-'
//                         END) RETURNING CLOB) DETAIL_CHILD
//         FROM N2N.D_BILLING bl
//         GROUP BY bl.PARENT_ID
//         ) y ON y.PARENT_ID = A.BILLING_ID
//     WHERE A.FLAG_PARENT IN (1,2)
//         AND A.KD_STATUS NOT IN ('302') AND A.KD_STATUS IS NOT NULL :billingCondition :month :status :wajib_faktur :divisi :keyword :dokumen
//     ORDER BY CASE 
//             WHEN (
//                     SELECT FLAG_NEW_DOK
//                     FROM D_PROJECT_STATUS
//                     WHERE PROJECT_ID = A.BILLING_ID
//                     ORDER BY DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY
//                     ) = 'T'
//                 THEN 2
//             ELSE 1
//             END DESC
//         ,E.LATEST_DATE_STATUS DESC;
// `

query.countListNoFaktur = `
WITH PROJECT AS (SELECT A.PROJECT_ID,
                        A.PROJECT_NO,
                        A.PROJECT_NAME,
                        B.CUSTOMER_NAME,
                        A.KD_SPUC
                 FROM D_PROJECT A
                          JOIN M_CUSTOMER B ON B.CUSTOMER_ID = A.CUSTOMER_ID
                 WHERE A.KD_STATUS = '005'
                   AND A.PROJECT_TYPE_ID = '1'),
     DOKUMEN_CTE AS (SELECT F.BILLING_ID,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '08001' THEN D.NO_DOKUMEN END)  AS NO_SURAT_TAGIHAN,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '08001' THEN D.TGL_DOKUMEN END) AS TGL_SURAT_TAGIHAN,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '01003' THEN D.NO_DOKUMEN END)  AS NO_FAKTUR_AWAL,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '01003' THEN D.TGL_DOKUMEN END) AS TGL_FAKTUR_AWAL,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '01032' THEN D.NO_DOKUMEN END)  AS NO_FAKTUR_PGNT,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '01032' THEN D.TGL_DOKUMEN END) AS TGL_FAKTUR_PGNT,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '01003' THEN D.TGL_DOKUMEN END) AS URL_FAKTUR_AWAL,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '01032' THEN D.NO_DOKUMEN END)  AS URL_FAKTUR_PGNT,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '04006' THEN D.NO_DOKUMEN END)  AS NO_BAST,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '04006' THEN D.TGL_DOKUMEN END) AS TGL_BAST,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '04009' THEN D.NO_DOKUMEN END)  AS NO_BAST_DRAFT,
                            MAX(CASE WHEN D.JNS_DOKUMEN = '04009' THEN D.TGL_DOKUMEN END) AS TGL_BAST_DRAFT
                     FROM D_BILLING_DOKUMEN F
                              JOIN D_DOKUMEN D
                                   ON D.DOKUMEN_ID = F.DOKUMEN_ID
                     WHERE D.JNS_DOKUMEN IN ('08001', '01003', '04006', '04009')
                     GROUP BY F.BILLING_ID)
SELECT count(A.BILLING_ID) AS "total_data",
        :page AS "total_halaman",
        :limit AS "limit"
FROM D_BILLING A
         JOIN D_BILLING_REVENUE B ON B.BILLING_ID = A.BILLING_ID
         JOIN PROJECT C ON C.PROJECT_ID = A.PROJECT_ID
         LEFT JOIN DOKUMEN_CTE DOK
                   ON DOK.BILLING_ID = A.BILLING_ID
         JOIN M_STATUS D ON D.KD_STATUS = A.KD_STATUS
WHERE A.FLAG_PARENT IN (1,2)
        AND A.KD_STATUS NOT IN ('302') AND A.KD_STATUS IS NOT NULL :billingCondition :month :status :wajib_faktur :divisi :keyword :dokumen 
ORDER BY A.BILLING_CODE ASC;
`

query.countListBillingMonitoring = `
    WITH P_PERCEPATAN AS ((SELECT A.*
                           FROM D_PROJECT A
                                    JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ACTUAL_ID AND B.KD_STATUS IN ('005')
                           WHERE A.PROJECT_TYPE_ID = '2')
                          UNION ALL
                          (SELECT A.*
                           FROM D_PROJECT A
                           WHERE A.PROJECT_TYPE_ID = '1'
                             AND A.KD_STATUS IN ('005')))
    SELECT count(A.BILLING_ID) AS "total_data",
       :page AS "total_halaman",
       :limit AS "limit" 
    FROM N2N.D_BILLING A
             JOIN P_PERCEPATAN B ON B.PROJECT_ID = A.PROJECT_ID
             LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = B.CUSTOMER_ID
             LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
             LEFT JOIN N2N.D_PROJECT_STATUS E ON E.PROJECT_ID = A.BILLING_ID
             LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
             LEFT JOIN N2N.M_STATUS G
                       ON G.KD_STATUS = E.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1')
    WHERE A.FLAG_PARENT = 1 :condition;`;

query.getListBillingRevenue = `
    WITH P_PROJECT AS (
                        --(SELECT A.*
                          --FROM D_PROJECT A
                                    --JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ACTUAL_ID AND B.--KD_STATUS IN ('005')
                           --WHERE A.PROJECT_TYPE_ID = '2')
                          --UNION ALL
                          (SELECT A.*
                           FROM D_PROJECT A
                           WHERE A.PROJECT_TYPE_ID = '1'
                             AND A.KD_STATUS IN ('005'))),
         LATEST_STATUS AS (SELECT PROJECT_ID, 
                                  MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '405') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
                                  --MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
                                  --MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
                                  --MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
                                  --MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
                                  --MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
                                  MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS TGL_PYMAD,
                                  MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS TGL_COMPLETED,
                                  MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS TGL_SUBMIT,
                                  MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS TGL_INVOICE,
                                  MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS TGL_PAID,
                                  MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
                                  MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
                                  TRIM(MAX(CASE WHEN KD_STATUS = '301' THEN 
                                  CASE
                                          WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
                                          ELSE CREATED_BY
                                      END
                                  END))                                                                      AS NAMA_DELIVERY,
                                TRIM(MAX(CASE WHEN KD_STATUS = '301' THEN 
                                  CASE
                                          WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 1)
                                          ELSE CREATED_BY
                                      END
                                  END))                                                                      AS NIP_DELIVERY 
                           FROM D_PROJECT_STATUS
                           WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '405') 
                           GROUP BY PROJECT_ID),
            SURAT_TAGIHAN AS (SELECT a.DOKUMEN_ID, a.NO_DOKUMEN, a.TGL_DOKUMEN, a.URL_DOKUMEN, a.FLAG_DELETE, a.JSON_DOK, a.NOTES, a.NO_REF, b.BILLING_ID, ROW_NUMBER() OVER (PARTITION BY b.BILLING_ID ORDER BY a.CREATED_AT DESC) AS RN FROM D_DOKUMEN a INNER JOIN D_BILLING_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID WHERE a.JNS_DOKUMEN = '08001' ORDER BY a.CREATED_AT DESC),
            DOKUMEN_INVOICE AS (SELECT a.DOKUMEN_ID, a.NO_DOKUMEN, a.TGL_DOKUMEN, a.URL_DOKUMEN, a.FLAG_DELETE, a.JSON_DOK, a.NOTES, a.NO_REF, b.BILLING_ID, ROW_NUMBER() OVER (PARTITION BY b.BILLING_ID ORDER BY a.CREATED_AT DESC) AS RN FROM D_DOKUMEN a INNER JOIN D_BILLING_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID WHERE a.JNS_DOKUMEN = '01004' ORDER BY a.CREATED_AT DESC),
            BAST AS (SELECT a.NO_DOKUMEN, a.TGL_DOKUMEN, a.URL_DOKUMEN, a.FLAG_DELETE, a.JSON_DOK, a.NOTES, a.NO_REF, b.BILLING_ID, ROW_NUMBER() OVER (PARTITION BY b.BILLING_ID ORDER BY a.CREATED_AT DESC) AS RN FROM D_DOKUMEN a INNER JOIN D_BILLING_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID WHERE a.JNS_DOKUMEN = '04006' ORDER BY a.CREATED_AT DESC)
            --LATEST_FLAG_DOK AS (SELECT PROJECT_ID, FLAG_NEW_DOK, TO_CHAR(UPDATED_AT, 'DD/MM/YYYY HH24:MI:SS') AS TGL_NEW_DOK FROM D_PROJECT_STATUS WHERE KD_STATUS = '402' ORDER BY DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY),
    SELECT A.BILLING_ID,
           A.BILLING_CODE,
           A.DIVISI_ID,
           A.EST_BILLING,
           (A.EST_PERIODE_BILLING || '-' || A.EST_BULAN_BILLING) AS EST_PERIODE_BILLING,
           (A.REAL_PERIODE_BILLING || '' || A.REAL_BULAN_BILLING) AS REAL_PERIODE_BILLING,
           A.PROJECT_ID,
           B.PROJECT_NO,
           B.PROJECT_NAME,
           B.KD_SPUC,
           C.CUSTOMER_NAME,
           C.WAPU,
           A.TERMIN,
           A.KD_STATUS,
           D.PORTOFOLIO,
           E.NIP_DELIVERY,
           E.NAMA_DELIVERY,
           A.KETERANGAN,
           A.DESC_TERMIN,
           F.NO_INVOICE,
           F.BILLING_REVENUE_ID,
           ST.NO_REF,
           ST.DOKUMEN_ID AS ID_SURAT_TAGIHAN,
           DI.DOKUMEN_ID AS ID_DOKUMEN_INVOICE,
           ST.NO_DOKUMEN AS NO_SURAT_TAGIHAN,
           CASE 
                WHEN ST.URL_DOKUMEN IS NOT NULL AND SUBSTR(ST.URL_DOKUMEN, 1, 5) = 'https' 
                    THEN ST.URL_DOKUMEN 
                WHEN ST.URL_DOKUMEN IS NOT NULL AND SUBSTR(ST.URL_DOKUMEN, 1, 5) != 'https'
                    THEN CONCAT('${LINK_DOK}', ST.URL_DOKUMEN) 
                ELSE ST.URL_DOKUMEN 
            END AS URL_SURAT_TAGIHAN,
           ST.TGL_DOKUMEN AS TGL_SURAT_TAGIHAN,
           ST.NOTES AS NOTE_SURAT_TAGIHAN,
           ST.FLAG_DELETE AS VALID_SURAT_TAGIHAN,
           TO_CHAR(BT.TGL_DOKUMEN, 'DD/MM/YYYY') AS TGL_BAST,
           (SELECT FLAG_NEW_DOK FROM D_PROJECT_STATUS WHERE PROJECT_ID = A.BILLING_ID ORDER BY DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) AS FLAG_NEW_DOK,
           (SELECT STATUS FROM D_SURAT_TAGIHAN_STATUS WHERE NO_REF = ST.NO_REF ORDER BY WAKTU_AKSI DESC FETCH FIRST 1 ROWS ONLY) AS LAST_STATUS_ST,
           (SELECT TO_CHAR(UPDATED_AT, 'DD/MM/YYYY HH24:MI:SS') FROM D_PROJECT_STATUS WHERE PROJECT_ID = A.BILLING_ID ORDER BY DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) AS TGL_NEW_DOK,
           CASE 
                WHEN A.KD_STATUS = '303' THEN
                'Req. Faktur' 
                WHEN A.KD_STATUS = '302' THEN
                'Rejected' 
                WHEN A.KD_STATUS = '301' THEN
                    'Sent' 
                WHEN A.KD_STATUS = '400' THEN
                    'Invoice' 
                WHEN A.KD_STATUS = '405' THEN
                    'Surat Tagihan' 
                WHEN A.KD_STATUS = '401' THEN
                    'Paid' 
                WHEN A.KD_STATUS = '402' THEN
                    'PYMAD' 
                WHEN A.KD_STATUS = '403' THEN
                    'Completed' 
                ELSE '-' END                         
            AS STATUS,
            CASE 
                WHEN A.KD_STATUS IN ('400', '401', '402', '403', '405') THEN 
                1 
                ELSE 0 END 
            AS FLAG_REJECT, 
           CASE
               WHEN A.KD_STATUS IN ('302','402','403') THEN F.NOMINAL_PYMAD
               WHEN A.KD_STATUS IN ('400','401','405') THEN F.NOMINAL_DPP
               ELSE A.REAL_BILLING END               AS NOMINAL,
           CASE
               WHEN F.STATUS_PELUNASAN = 'T' THEN to_char(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY')
               WHEN F.STATUS_INVOICE = 'T' THEN to_char(F.TANGGAL_INVOICE, 'DD/MM/YYYY')
               ELSE '-' END                          AS TANGGAL,
           CONCAT(to_char(b.MARGIN_PRESENTASE), '%') AS "MARGIN_PRESENTASE",
           G.URAIAN                                  AS "URAIAN_STATUS",
           --H.FLAG_NEW_DOK,
           --H.TGL_NEW_DOK,
           E.LATEST_DATE_STATUS,
           TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
           y.DETAIL_CHILD,
           yy.DETAIL_PROJECT,
           TRUNC(SYSDATE) - TO_DATE(E.TGL_PYMAD, 'YYYY-MM-DD') AS "SLA_KELENGKAPAN_DOKUMEN",
           E.TGL_PYMAD,
           E.TGL_COMPLETED,
           E.TGL_SUBMIT,
           E.TGL_INVOICE,
           E.TGL_PAID,
           --E.SLA_KD_START                              AS "SLA0_START",
           --E.SLA_KD_END                              AS "SLA0_END",
           --E.SLA_SUBMIT_START                              AS "SLA1_START",
           --E.SLA_INVOICE_START                              AS "SLA1_END",
           --E.SLA_INVOICE_START                              AS "SLA2_START",
           --E.SLA_PAID                                AS "SLA2_END",
           E.KETERANGAN_REJECT,
           E.KETERANGAN_REQ_FAKTUR,
           (SELECT dps.STATUS_ID FROM D_PROJECT_STATUS dps WHERE dps.PROJECT_ID = A.BILLING_ID ORDER BY dps.DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) AS STATUS_ID,
           TO_CHAR(F.TANGGAL_INVOICE, 'DD/MM/YYYY') AS TANGGAL_INVOICE,
           TO_CHAR(F.TANGGAL_POSTING, 'DD/MM/YYYY') AS TANGGAL_POSTING,
           TO_CHAR(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY') AS TANGGAL_PELUNASAN,
           CASE
           WHEN ((SELECT COUNT(dps.STATUS_ID)
                  FROM D_PROJECT_STATUS dps
                  WHERE dps.PROJECT_ID = A.BILLING_ID
                    AND dps.KD_STATUS IN ('402')) > 0) THEN '1'
           ELSE '0' END                                        AS "FLAG_PYMAD",
       CASE WHEN jh.ACCRUAL_NO IS NULL THEN '0'
            ELSE '1'
            END AS "FLAG_ACCRUAL",
       jh.ACCRUAL_NO,
           F.NOMINAL_DPP,
           F.NOMINAL_INVOICE,
           F.PPN,
           F.PPN_TARIF,
           F.KODE_BAYAR,
           A.INT_NUMBER,
           A.DOC_NUMBER,
           A.NO_INTEGRASI,
           hdr.IS_ACTIVE AS REQ_DOC,
           CASE WHEN ((SELECT COUNT(dps.STATUS_ID) FROM D_PROJECT_STATUS dps WHERE dps.PROJECT_ID = A.BILLING_ID AND dps.KD_STATUS IN ('402')) > 0) THEN '1' ELSE '0' END AS "FLAG_PYMAD" :select 
    FROM N2N.D_BILLING A
             JOIN P_PROJECT B ON B.PROJECT_ID = A.PROJECT_ID
             LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID 
             LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = COALESCE(F.CUSTOMER_ID_TO_SAP, B.CUSTOMER_ID) 
             LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
             LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
             LEFT JOIN SURAT_TAGIHAN ST ON ST.BILLING_ID = A.BILLING_ID AND ST.RN = 1 
             LEFT JOIN DOKUMEN_INVOICE DI ON DI.BILLING_ID = A.BILLING_ID AND DI.RN = 1 
             LEFT JOIN BAST BT ON BT.BILLING_ID = A.BILLING_ID AND BT.RN = 1 
             LEFT JOIN N2N.M_STATUS G
                       ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1') 
            --LEFT JOIN LATEST_FLAG_DOK H ON H.PROJECT_ID = A.BILLING_ID 
            LEFT JOIN (SELECT
                bl.PARENT_ID,
                JSON_ARRAYAGG(
                    JSON_OBJECT('BILLING_ID' VALUE bl.BILLING_ID,
                        'BILLING_CODE' VALUE bl.BILLING_CODE,
                        'PROJECT_ID' VALUE bl.PROJECT_ID,
                        'TERMIN' VALUE bl.TERMIN,
                        'DESC_TERMIN' VALUE bl.DESC_TERMIN,
                        'KETERANGAN' VALUE bl.KETERANGAN,
                        'EST_BILLING' VALUE bl.EST_BILLING,
                        'EST_BULAN_BILLING' VALUE bl.EST_BULAN_BILLING,
                        'EST_PERIODE_BILLING' VALUE bl.EST_PERIODE_BILLING,
                        'REAL_BILLING' VALUE bl.REAL_BILLING,
                        'REAL_BULAN_BILLING' VALUE bl.REAL_BULAN_BILLING,
                        'REAL_PERIODE_BILLING' VALUE bl.REAL_PERIODE_BILLING,
                        'STATUS_BILLING' VALUE CASE 
                                                WHEN bl.KD_STATUS = '304' THEN
                                                    'Faktur Done' 
                                                WHEN bl.KD_STATUS = '303' THEN
                                                    'Req. Faktur' 
                                                WHEN bl.KD_STATUS = '302' THEN
                                                    'Rejected' 
                                                WHEN bl.KD_STATUS = '301' THEN
                                                    'Submitted' 
                                                WHEN bl.KD_STATUS = '400' THEN
                                                    'Invoice' 
                                                WHEN bl.KD_STATUS = '405' THEN
                                                    'Surat Tagihan' 
                                                WHEN bl.KD_STATUS = '401' THEN
                                                    'Paid' 
                                                WHEN bl.KD_STATUS = '402' THEN
                                                    'PYMAD' 
                                                WHEN bl.KD_STATUS = '403' THEN
                                                    'Completed' 
                                                ELSE '-'
                                            END)
                         RETURNING CLOB) DETAIL_CHILD
    FROM N2N.D_BILLING bl GROUP BY bl.PARENT_ID) y ON y.PARENT_ID = A.BILLING_ID 
    LEFT JOIN (SELECT
                bl.PROJECT_ACTUAL_ID,
                JSON_ARRAYAGG(
                    JSON_OBJECT('PROJECT_ID' VALUE bl.PROJECT_ID,
                        'PROJECT_NAME' VALUE bl.PROJECT_NAME,
                        'PROJECT_NO' VALUE bl.PROJECT_NO,
                        'PORTOFOLIO' VALUE mp.PORTOFOLIO,
                        'CUSTOMER' VALUE mc.CUSTOMER_NAME,
                        'SPUC' VALUE bl.KD_SPUC,
                        'NILAI_KONTRAK' VALUE bl.NILAI_KONTRAK,
                        'NOMOR_KONTRAK' VALUE bl.CONTRACT_NO,
                        'MARGIN_KONTRAK' VALUE bl.MARGIN_KONTRAK,
                        'COGS' VALUE bl.COGS,
                        'NIP_SALES' VALUE bl.NIP_SALES,
                        'TIPE_PROJECT' VALUE mr1.UR_REF,
                        'KATEGORI_PROJECT' VALUE mr2.UR_REF,
                        'PROJECT_MODEL' VALUE mr3.UR_REF,
                        'NAMA_SALES' VALUE bl.NAMA_SALES)
                         RETURNING CLOB) DETAIL_PROJECT
    FROM N2N.D_PROJECT bl JOIN M_PORTOFOLIO mp ON mp.PORTOFOLIO_ID = bl.PORTOFOLIO_ID JOIN M_CUSTOMER mc ON mc.CUSTOMER_ID = bl.CUSTOMER_ID LEFT JOIN M_REFERENSI mr1 ON mr1.KD_REF = bl.PROJECT_TYPE_ID AND mr1.JNS_REF = 'project_type_id' LEFT JOIN M_REFERENSI mr2 ON mr2.KD_REF = bl.CATEGORY_ID AND mr2.JNS_REF = 'category_id' LEFT JOIN M_REFERENSI mr3 ON mr3.KD_REF = bl.PROJECT_MODEL_ID AND mr3.JNS_REF = 'category_project' GROUP BY bl.PROJECT_ACTUAL_ID) yy ON yy.PROJECT_ACTUAL_ID = B.PROJECT_ID LEFT JOIN J_HEADER jh ON jh.SOURCE_ID = A.BILLING_ID AND jh.ACCRUAL_TYPE = 'REVENUE_PYMAD' AND jh.STATUS = 'POSTED' LEFT JOIN (
        SELECT *
        FROM (
            SELECT hdr.*,
                ROW_NUMBER() OVER (
                    PARTITION BY hdr.TARGET_ID 
                    ORDER BY hdr.CREATED_AT DESC
                ) rn
            FROM H_DOC_REQ hdr
        )
        WHERE rn = 1
    ) hdr ON hdr.TARGET_ID = A.BILLING_CODE 
    WHERE A.FLAG_PARENT IN (1,2) AND A.KD_STATUS IN ('303', '302', '304', '301', '400', '405', '401', '402', '403')
      :searchHeader :condition :order_by 
    OFFSET (:page - 1) * :limit ROWS -- Calculate offset
        FETCH NEXT :limit ROWS ONLY;
    `

query.getListBillingNonProject = `
    WITH LATEST_STATUS AS (SELECT PROJECT_ID, 
                                  MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '405') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
                                  --MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
                                  --MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
                                  --MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
                                  --MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
                                  --MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
                                  MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS TGL_PYMAD,
                                  MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS TGL_COMPLETED,
                                  MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS TGL_SUBMIT,
                                  MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS TGL_INVOICE,
                                  MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS TGL_PAID,
                                  MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
                                  MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
                                  MAX(CASE
                                          WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
                                          ELSE CREATED_BY
                                      END)                                                                      AS NAMA_DELIVERY 
                           FROM D_PROJECT_STATUS
                           WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '405') 
                           GROUP BY PROJECT_ID),
            SURAT_TAGIHAN AS (SELECT a.NO_DOKUMEN, a.TGL_DOKUMEN, a.URL_DOKUMEN, a.FLAG_DELETE, a.JSON_DOK, a.NOTES, a.NO_REF, b.BILLING_ID FROM D_DOKUMEN a INNER JOIN D_BILLING_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID WHERE a.JNS_DOKUMEN = '08001' AND a.FLAG_DELETE = 'F')
            --LATEST_FLAG_DOK AS (SELECT PROJECT_ID, FLAG_NEW_DOK, TO_CHAR(UPDATED_AT, 'DD/MM/YYYY HH24:MI:SS') AS TGL_NEW_DOK FROM D_PROJECT_STATUS WHERE KD_STATUS = '402' ORDER BY DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY),
    SELECT A.BILLING_ID,
           A.BILLING_CODE,
           A.PROJECT_NAME,
           A.KD_SPUC,
           C.CUSTOMER_NAME,
           A.TERMIN,
           A.KD_STATUS,
           D.PORTOFOLIO,
           E.NAMA_DELIVERY,
           A.KETERANGAN,
           A.DESC_TERMIN,
           F.NO_INVOICE,
           ST.NO_REF,
           ST.NO_DOKUMEN AS NO_SURAT_TAGIHAN,
           CASE 
                WHEN ST.URL_DOKUMEN IS NOT NULL AND SUBSTR(ST.URL_DOKUMEN, 1, 5) = 'https' 
                    THEN ST.URL_DOKUMEN 
                WHEN ST.URL_DOKUMEN IS NOT NULL AND SUBSTR(ST.URL_DOKUMEN, 1, 5) != 'https'
                    THEN CONCAT('${LINK_DOK}', ST.URL_DOKUMEN) 
                ELSE ST.URL_DOKUMEN 
            END AS URL_SURAT_TAGIHAN,
           ST.TGL_DOKUMEN AS TGL_SURAT_TAGIHAN,
           ST.NOTES AS NOTE_SURAT_TAGIHAN,
           ST.FLAG_DELETE AS VALID_SURAT_TAGIHAN,
           (SELECT FLAG_NEW_DOK FROM D_PROJECT_STATUS WHERE PROJECT_ID = A.BILLING_ID ORDER BY DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) AS FLAG_NEW_DOK,
           (SELECT STATUS FROM D_SURAT_TAGIHAN_STATUS WHERE BILLING_ID = A.BILLING_ID AND NO_REF = ST.NO_REF ORDER BY WAKTU_AKSI DESC FETCH FIRST 1 ROWS ONLY) AS LAST_STATUS_ST,
           (SELECT TO_CHAR(UPDATED_AT, 'DD/MM/YYYY HH24:MI:SS') FROM D_PROJECT_STATUS WHERE PROJECT_ID = A.BILLING_ID ORDER BY DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) AS TGL_NEW_DOK,
           CASE 
                WHEN A.KD_STATUS = '400' THEN
                    'Invoice' 
                WHEN A.KD_STATUS = '405' THEN
                    'Surat Tagihan' 
                WHEN A.KD_STATUS = '401' THEN
                    'Paid' 
                ELSE '-' END                         
            AS STATUS,
            CASE 
                WHEN A.KD_STATUS IN ('400', '401', '405') THEN 
                1 
                ELSE 0 END 
            AS FLAG_REJECT, 
           CASE
               WHEN A.KD_STATUS = '401' THEN F.NOMINAL_PELUNASAN
               WHEN A.KD_STATUS = '400' THEN F.NOMINAL_INVOICE
               ELSE A.REAL_BILLING END               AS NOMINAL,
           CASE
               WHEN F.STATUS_PELUNASAN = 'T' THEN to_char(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY')
               WHEN F.STATUS_INVOICE = 'T' THEN to_char(F.TANGGAL_INVOICE, 'DD/MM/YYYY')
               ELSE '-' END                          AS TANGGAL,
           CONCAT(to_char(b.MARGIN_PRESENTASE), '%') AS "MARGIN_PRESENTASE",
           G.URAIAN                                  AS "URAIAN_STATUS",
           --H.FLAG_NEW_DOK,
           --H.TGL_NEW_DOK,
           E.LATEST_DATE_STATUS,
           TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
           y.DETAIL_CHILD,
           TRUNC(SYSDATE) - TO_DATE(E.TGL_PYMAD, 'YYYY-MM-DD') AS "SLA_KELENGKAPAN_DOKUMEN",
           E.TGL_PYMAD,
           E.TGL_COMPLETED,
           E.TGL_SUBMIT,
           E.TGL_INVOICE,
           E.TGL_PAID,
           --E.SLA_KD_START                              AS "SLA0_START",
           --E.SLA_KD_END                              AS "SLA0_END",
           --E.SLA_SUBMIT_START                              AS "SLA1_START",
           --E.SLA_INVOICE_START                              AS "SLA1_END",
           --E.SLA_INVOICE_START                              AS "SLA2_START",
           --E.SLA_PAID                                AS "SLA2_END",
           E.KETERANGAN_REJECT,
           E.KETERANGAN_REQ_FAKTUR,
           TO_CHAR(F.TANGGAL_INVOICE, 'DD/MM/YYYY') AS TANGGAL_INVOICE,
           TO_CHAR(F.TANGGAL_INVOICE, 'DD/MM/YYYY') AS TANGGAL_POSTING,
           TO_CHAR(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY') AS TANGGAL_PELUNASAN,
           F.NOMINAL_DPP,
           F.NOMINAL_INVOICE,
           CASE WHEN ((SELECT COUNT(dps.STATUS_ID) FROM D_PROJECT_STATUS dps WHERE dps.PROJECT_ID = A.BILLING_ID AND dps.KD_STATUS IN ('402')) > 0) THEN '1' ELSE '0' END AS "FLAG_PYMAD" :select 
    FROM N2N.D_BILLING_NONPROJECT A
             LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = A.CUSTOMER_ID
             LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = A.PORTOFOLIO_ID
             LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
             LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID 
             LEFT JOIN SURAT_TAGIHAN ST ON ST.BILLING_ID = A.BILLING_ID 
             LEFT JOIN N2N.M_STATUS G
                       ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1') 
            --LEFT JOIN LATEST_FLAG_DOK H ON H.PROJECT_ID = A.BILLING_ID 
            LEFT JOIN (SELECT
        bl.PARENT_ID,
        JSON_ARRAYAGG(
            JSON_OBJECT('BILLING_ID' VALUE bl.BILLING_ID,
                        'TERMIN' VALUE bl.TERMIN,
                        'DESC_TERMIN' VALUE bl.DESC_TERMIN,
                        'KETERANGAN' VALUE bl.KETERANGAN,
                        'EST_BILLING' VALUE bl.EST_BILLING,
                        'EST_BULAN_BILLING' VALUE bl.EST_BULAN_BILLING,
                        'EST_PERIODE_BILLING' VALUE bl.EST_PERIODE_BILLING,
                        'REAL_BILLING' VALUE bl.REAL_BILLING,
                        'REAL_BULAN_BILLING' VALUE bl.REAL_BULAN_BILLING,
                        'REAL_PERIODE_BILLING' VALUE bl.REAL_PERIODE_BILLING,
                        'STATUS_BILLING' VALUE CASE 
                                                WHEN bl.KD_STATUS = '304' THEN
                                                    'Faktur Done' 
                                                WHEN bl.KD_STATUS = '303' THEN
                                                    'Req. Faktur' 
                                                WHEN bl.KD_STATUS = '302' THEN
                                                    'Rejected' 
                                                WHEN bl.KD_STATUS = '301' THEN
                                                    'Submitted' 
                                                WHEN bl.KD_STATUS = '400' THEN
                                                    'Invoice' 
                                                WHEN bl.KD_STATUS = '405' THEN
                                                    'Surat Tagihan' 
                                                WHEN bl.KD_STATUS = '401' THEN
                                                    'Paid' 
                                                WHEN bl.KD_STATUS = '402' THEN
                                                    'PYMAD' 
                                                WHEN bl.KD_STATUS = '403' THEN
                                                    'Completed' 
                                                ELSE '-'
                                            END)
                         RETURNING CLOB) DETAIL_CHILD
    FROM N2N.D_BILLING_NONPROJECT bl GROUP BY bl.PARENT_ID) y ON y.PARENT_ID = A.BILLING_ID 
    WHERE A.FLAG_PARENT IN (1,2) AND A.KD_STATUS IN ('400', '405', '401')
      :searchHeader :condition :order_by 
    OFFSET (:page - 1) * :limit ROWS -- Calculate offset
        FETCH NEXT :limit ROWS ONLY;
    `;

query.getListBillingRevenue1 = `
SELECT abc.* 
    FROM (
    SELECT * FROM (SELECT
        a.BILLING_ID,
        b.PROJECT_ID,
        b.PROJECT_NO,
        b.PROJECT_NAME,
        c.CUSTOMER_NAME,
        a.TERMIN,
        d.PORTOFOLIO,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN 'Pelunasan' 
            WHEN e.STATUS_INVOICE = 'T' THEN 'Invoice' 
            ELSE '-' END 
        AS STATUS,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN e.NOMINAL_PELUNASAN 
            WHEN e.STATUS_INVOICE = 'T' THEN e.NOMINAL_INVOICE 
            ELSE a.REAL_BILLING END 
        AS NOMINAL,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN to_char(e.TANGGAL_PELUNASAN,'DD/MM/YYYY') 
            WHEN e.STATUS_INVOICE = 'T' THEN to_char(e.TANGGAL_INVOICE,'DD/MM/YYYY') 
            ELSE '-' END 
        AS TANGGAL,
        CONCAT(to_char(b.MARGIN_PRESENTASE),'%') AS "MARGIN_PRESENTASE",
        f.URAIAN AS "URAIAN_STATUS",
        a.CREATED_AT,
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '301' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA1_START",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '402' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA1_END",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '402' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA2_START",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '401' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA2_END" 
    FROM N2N.D_BILLING a
    JOIN N2N.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID
    JOIN N2N.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = b.PORTOFOLIO_ID
    LEFT JOIN N2N.M_CUSTOMER c ON c.CUSTOMER_ID = b.CUSTOMER_ID 
    LEFT JOIN N2N.D_BILLING_REVENUE e ON e.BILLING_ID = a.BILLING_ID
    LEFT JOIN N2N.M_STATUS f ON f.KD_STATUS = a.KD_STATUS AND (f.ID_TAB_STATUS = 'FN1' OR f.ID_TAB_STATUS = 'DL1') 
    WHERE 
        a.KD_STATUS IN ('301','400','401') AND (e.STATUS_INVOICE IS NULL OR e.STATUS_INVOICE = 'F') 
    ORDER BY a.CREATED_AT :order) a 
UNION ALL 
    SELECT * FROM (SELECT
        a.BILLING_ID,
        b.PROJECT_ID,
        b.PROJECT_NO,
        b.PROJECT_NAME,
        c.CUSTOMER_NAME,
        a.TERMIN,
        d.PORTOFOLIO,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN 'Pelunasan' 
            WHEN e.STATUS_INVOICE = 'T' THEN 'Invoice' 
            ELSE '-' END 
        AS STATUS,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN e.NOMINAL_PELUNASAN 
            WHEN e.STATUS_INVOICE = 'T' THEN e.NOMINAL_INVOICE 
            ELSE a.REAL_BILLING END 
        AS NOMINAL,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN to_char(e.TANGGAL_PELUNASAN,'DD/MM/YYYY') 
            WHEN e.STATUS_INVOICE = 'T' THEN to_char(e.TANGGAL_INVOICE,'DD/MM/YYYY') 
            ELSE '-' END 
        AS TANGGAL,
        CONCAT(to_char(b.MARGIN_PRESENTASE),'%') AS "MARGIN_PRESENTASE",
        f.URAIAN AS "URAIAN_STATUS",
        a.CREATED_AT,
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '301' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA1_START",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '402' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA1_END",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '402' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA2_START",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '401' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA2_END" 
    FROM N2N.D_BILLING a
    JOIN N2N.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID
    JOIN N2N.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = b.PORTOFOLIO_ID
    LEFT JOIN N2N.M_CUSTOMER c ON c.CUSTOMER_ID = b.CUSTOMER_ID
    LEFT JOIN N2N.D_BILLING_REVENUE e ON e.BILLING_ID = a.BILLING_ID
    LEFT JOIN N2N.M_STATUS f ON f.KD_STATUS = a.KD_STATUS AND (f.ID_TAB_STATUS = 'FN1' OR f.ID_TAB_STATUS = 'DL1')
    WHERE 
        a.KD_STATUS IN ('301','400','401') AND e.STATUS_INVOICE = 'T' AND (e.STATUS_PELUNASAN IS NULL OR e.STATUS_PELUNASAN = 'F') 
    ORDER BY a.CREATED_AT :order) b 
UNION ALL 
    SELECT * FROM (SELECT
        a.BILLING_ID,
        b.PROJECT_ID,
        b.PROJECT_NO,
        b.PROJECT_NAME,
        c.CUSTOMER_NAME,
        a.TERMIN,
        d.PORTOFOLIO,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN 'Pelunasan' 
            WHEN e.STATUS_INVOICE = 'T' THEN 'Invoice' 
            ELSE '-' END 
        AS STATUS,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN e.NOMINAL_PELUNASAN 
            WHEN e.STATUS_INVOICE = 'T' THEN e.NOMINAL_INVOICE 
            ELSE a.REAL_BILLING END 
        AS NOMINAL,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN to_char(e.TANGGAL_PELUNASAN,'DD/MM/YYYY') 
            WHEN e.STATUS_INVOICE = 'T' THEN to_char(e.TANGGAL_INVOICE,'DD/MM/YYYY') 
            ELSE '-' END 
        AS TANGGAL,
        CONCAT(to_char(b.MARGIN_PRESENTASE),'%') AS "MARGIN_PRESENTASE",
        f.URAIAN AS "URAIAN_STATUS",
        a.CREATED_AT,
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '301' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA1_START",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '402' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA1_END",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '402' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA2_START",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '401' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA2_END" 
    FROM N2N.D_BILLING a
    JOIN N2N.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID
    JOIN N2N.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = b.PORTOFOLIO_ID
    LEFT JOIN N2N.M_CUSTOMER c ON c.CUSTOMER_ID = b.CUSTOMER_ID
    LEFT JOIN N2N.D_BILLING_REVENUE e ON e.BILLING_ID = a.BILLING_ID
    LEFT JOIN N2N.M_STATUS f ON f.KD_STATUS = a.KD_STATUS AND (f.ID_TAB_STATUS = 'FN1' OR f.ID_TAB_STATUS = 'DL1')
    WHERE 
        a.KD_STATUS IN ('301','400','401') AND e.STATUS_PELUNASAN = 'T' 
    ORDER BY a.CREATED_AT :order) c
) abc :condition 
OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`

query.getListBillingRevenue2 = `
SELECT abc.* FROM (
    SELECT * FROM (SELECT
        a.BILLING_ID,
        b.PROJECT_ID,
        b.PROJECT_NO,
        b.PROJECT_NAME,
        c.CUSTOMER_NAME,
        a.TERMIN,
        d.PORTOFOLIO,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN 'Pelunasan' 
            WHEN e.STATUS_INVOICE = 'T' THEN 'Invoice' 
            ELSE '-' END 
        AS STATUS,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN e.NOMINAL_PELUNASAN 
            WHEN e.STATUS_INVOICE = 'T' THEN e.NOMINAL_INVOICE 
            ELSE a.REAL_BILLING END 
        AS NOMINAL,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN to_char(e.TANGGAL_PELUNASAN,'DD/MM/YYYY') 
            WHEN e.STATUS_INVOICE = 'T' THEN to_char(e.TANGGAL_INVOICE,'DD/MM/YYYY') 
            ELSE '-' END 
        AS TANGGAL,
        CONCAT(to_char(b.MARGIN_PRESENTASE),'%') AS "MARGIN_PRESENTASE",
        f.URAIAN AS "URAIAN_STATUS",
        a.CREATED_AT,
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '301' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA1_START",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '402' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA1_END",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '402' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA2_START",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '401' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA2_END" 
    FROM N2N.D_BILLING a
    JOIN N2N.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID
    JOIN N2N.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = b.PORTOFOLIO_ID
    LEFT JOIN N2N.M_CUSTOMER c ON c.CUSTOMER_ID = b.CUSTOMER_ID
    LEFT JOIN N2N.D_BILLING_REVENUE e ON e.BILLING_ID = a.BILLING_ID
    LEFT JOIN N2N.M_STATUS f ON f.KD_STATUS = a.KD_STATUS AND f.ID_TAB_STATUS = 'FN1'
    WHERE 
        a.KD_STATUS IN ('400','401') AND e.STATUS_PELUNASAN = 'T'  
    ORDER BY a.CREATED_AT :order) a
UNION ALL
    SELECT * FROM (SELECT
        a.BILLING_ID,
        b.PROJECT_ID,
        b.PROJECT_NO,
        b.PROJECT_NAME,
        c.CUSTOMER_NAME,
        a.TERMIN,
        d.PORTOFOLIO,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN 'Pelunasan' 
            WHEN e.STATUS_INVOICE = 'T' THEN 'Invoice' 
            ELSE '-' END 
        AS STATUS,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN e.NOMINAL_PELUNASAN 
            WHEN e.STATUS_INVOICE = 'T' THEN e.NOMINAL_INVOICE 
            ELSE a.REAL_BILLING END 
        AS NOMINAL,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN to_char(e.TANGGAL_PELUNASAN,'DD/MM/YYYY') 
            WHEN e.STATUS_INVOICE = 'T' THEN to_char(e.TANGGAL_INVOICE,'DD/MM/YYYY') 
            ELSE '-' END 
        AS TANGGAL,
        CONCAT(to_char(b.MARGIN_PRESENTASE),'%') AS "MARGIN_PRESENTASE",
        f.URAIAN AS "URAIAN_STATUS",
        a.CREATED_AT,
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '301' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA1_START",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '402' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA1_END",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '402' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA2_START",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '401' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA2_END" 
    FROM N2N.D_BILLING a
    JOIN N2N.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID
    JOIN N2N.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = b.PORTOFOLIO_ID
    LEFT JOIN N2N.M_CUSTOMER c ON c.CUSTOMER_ID = b.CUSTOMER_ID
    LEFT JOIN N2N.D_BILLING_REVENUE e ON e.BILLING_ID = a.BILLING_ID
    LEFT JOIN N2N.M_STATUS f ON f.KD_STATUS = a.KD_STATUS AND f.ID_TAB_STATUS = 'FN1'
    WHERE 
        a.KD_STATUS IN ('400','401') AND e.STATUS_INVOICE = 'T' AND (e.STATUS_PELUNASAN IS NULL OR e.STATUS_PELUNASAN = 'F')  
    ORDER BY a.CREATED_AT :order) b 
UNION ALL 
    SELECT * FROM (SELECT
        a.BILLING_ID,
        b.PROJECT_ID,
        b.PROJECT_NO,
        b.PROJECT_NAME,
        c.CUSTOMER_NAME,
        a.TERMIN,
        d.PORTOFOLIO,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN 'Pelunasan' 
            WHEN e.STATUS_INVOICE = 'T' THEN 'Invoice' 
            ELSE '-' END 
        AS STATUS,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN e.NOMINAL_PELUNASAN 
            WHEN e.STATUS_INVOICE = 'T' THEN e.NOMINAL_INVOICE 
            ELSE a.REAL_BILLING END 
        AS NOMINAL,
        CASE 
            WHEN e.STATUS_PELUNASAN = 'T' THEN to_char(e.TANGGAL_PELUNASAN,'DD/MM/YYYY') 
            WHEN e.STATUS_INVOICE = 'T' THEN to_char(e.TANGGAL_INVOICE,'DD/MM/YYYY') 
            ELSE '-' END 
        AS TANGGAL,
        CONCAT(to_char(b.MARGIN_PRESENTASE),'%') AS "MARGIN_PRESENTASE",
        f.URAIAN AS "URAIAN_STATUS",
        a.CREATED_AT,
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '301' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA1_START",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '402' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA1_END",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '402' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA2_START",
        (SELECT CASE WHEN DATE_STATUS IS NULL THEN NULL ELSE to_char(DATE_STATUS, 'YYYY-MM-DD') END FROM (SELECT DATE_STATUS FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '401' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS "SLA2_END" 
    FROM N2N.D_BILLING a
    JOIN N2N.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID
    JOIN N2N.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = b.PORTOFOLIO_ID
    LEFT JOIN N2N.M_CUSTOMER c ON c.CUSTOMER_ID = b.CUSTOMER_ID
    LEFT JOIN N2N.D_BILLING_REVENUE e ON e.BILLING_ID = a.BILLING_ID
    LEFT JOIN N2N.M_STATUS f ON f.KD_STATUS = a.KD_STATUS AND f.ID_TAB_STATUS = 'FN1'
    WHERE 
        a.KD_STATUS IN ('400','401') AND (e.STATUS_INVOICE IS NULL OR e.STATUS_INVOICE = 'F')  
    ORDER BY a.CREATED_AT :order) c
) abc :condition
OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`

query.countListBillingRevenue = `
WITH P_PERCEPATAN AS ((SELECT A.*
                       FROM D_PROJECT A
                                JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ACTUAL_ID AND B.KD_STATUS IN ('005')
                       WHERE A.PROJECT_TYPE_ID = '2')
                      UNION ALL
                      (SELECT A.*
                       FROM D_PROJECT A
                       WHERE A.PROJECT_TYPE_ID = '1'
                         AND A.KD_STATUS IN ('005'))),
     LATEST_STATUS AS (SELECT PROJECT_ID,
                              MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '405') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
                              MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
                              MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
                              MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
                              MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
                              MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
                              MAX(CASE
                                      WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
                                      ELSE CREATED_BY
                                  END)                                                                      AS NAMA_DELIVERY
                       FROM D_PROJECT_STATUS
                       WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '405') 
                       GROUP BY PROJECT_ID)
SELECT count(A.BILLING_ID) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit" 
FROM N2N.D_BILLING A
         JOIN P_PERCEPATAN B ON B.PROJECT_ID = A.PROJECT_ID
         LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = B.CUSTOMER_ID
         LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
         LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
         LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
         LEFT JOIN N2N.M_STATUS G
                   ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1')
WHERE A.FLAG_PARENT IN (1,2) AND A.KD_STATUS IN ('303', '302', '301', '304', '400', '405', '401', '402', '403') :condition;`

query.countListBillingNonProject = `
WITH LATEST_STATUS AS (SELECT PROJECT_ID,
                              MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '405') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
                              MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
                              MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
                              MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
                              MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
                              MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
                              MAX(CASE
                                      WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
                                      ELSE CREATED_BY
                                  END)                                                                      AS NAMA_DELIVERY
                       FROM D_PROJECT_STATUS
                       WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '405') 
                       GROUP BY PROJECT_ID)
SELECT count(A.BILLING_ID) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit" 
FROM N2N.D_BILLING_NONPROJECT A
         LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = A.CUSTOMER_ID
         LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = A.PORTOFOLIO_ID
         LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
         LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
         LEFT JOIN N2N.M_STATUS G
                   ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1')
WHERE A.FLAG_PARENT IN (1,2) AND A.KD_STATUS IN ('400', '405', '401') :condition;`

query.getDetailBillingRevenue = `
WITH CUSTOMER_TO_SAP AS (SELECT dbr.BILLING_ID, dbr.CUSTOMER_ID_TO_SAP, mc.CUSTOMER_NAME AS CUSTOMER_NAME_TO_SAP, mc.CUSTOMER_MDM, mc.CUSTOMER_SAP_AR, mc.ADDRESS AS CUSTOMER_ADDRESS_TO_SAP, mc.KOTA AS KOTA_TO_SAP, mc.PROFIT_CENTER, mc.NITKU, mc.TIN FROM D_BILLING_REVENUE dbr JOIN M_CUSTOMER mc ON mc.CUSTOMER_ID = dbr.CUSTOMER_ID_TO_SAP),
BILLING_STATUS AS (SELECT rn, PROJECT_ID, KD_STATUS
FROM (
  SELECT PROJECT_ID, KD_STATUS,
         ROW_NUMBER() OVER (PARTITION BY PROJECT_ID ORDER BY DATE_STATUS DESC) AS rn
  FROM D_PROJECT_STATUS
)),
SURAT_TAGIHAN AS (SELECT a.DOKUMEN_ID, a.NO_DOKUMEN, a.TGL_DOKUMEN, a.URL_DOKUMEN, a.FLAG_DELETE, a.JSON_DOK, a.NO_REF, a.NOTES, b.BILLING_ID, a.CREATED_BY, a.CREATED_AT FROM D_DOKUMEN a INNER JOIN D_BILLING_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID WHERE a.JNS_DOKUMEN = '08001' AND a.FLAG_DELETE = 'F'),
LATEST_STATUS_INVOICE AS (SELECT PROJECT_ID,
                                  MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS TGL_INVOICE,
                                  MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'FMMonth YYYY', 'NLS_DATE_LANGUAGE=INDONESIAN') END)  AS PERIODE_INVOICE 
                           FROM D_PROJECT_STATUS
                           WHERE KD_STATUS IN ('400') 
                           GROUP BY PROJECT_ID),
SUBMITED_STATUS AS (SELECT PROJECT_ID, 
                    TRIM(MAX
                                  (CASE
                                          WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 1)
                                          ELSE CREATED_BY
                                      END
)) AS NIP_DELIVERY FROM D_PROJECT_STATUS WHERE KD_STATUS = '301' GROUP BY PROJECT_ID),
DOKUMEN_MIR7 AS (SELECT a.DOKUMEN_ID, a.NO_DOKUMEN, a.TGL_DOKUMEN, a.URL_DOKUMEN, a.FLAG_DELETE, a.JSON_DOK, a.NO_REF, a.NOTES, b.BILLING_ID, a.CREATED_BY, a.CREATED_AT FROM D_DOKUMEN a INNER JOIN D_BILLING_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID WHERE a.JNS_DOKUMEN = '99992' AND a.FLAG_DELETE = 'F')
SELECT
    b.PROJECT_ID,
    b.PROJECT_NO,
    b.PROJECT_NAME,
    b.NAMA_SALES,
    b.CONTRACT_NO AS NO_KONTRAK, 
    c.CUSTOMER_ID,
    c.CUSTOMER_NAME,
    c.COMP_CODE CUSTOMER_COMP_CODE,
    cts.CUSTOMER_ID_TO_SAP,
    cts.CUSTOMER_NAME_TO_SAP,
    cts.CUSTOMER_ADDRESS_TO_SAP,
    c.CUSTOMER_MDM,
    c.CUSTOMER_SAP_AR,
    c.NITKU CUSTOMER_NITKU,
    cts.NITKU CUSTOMER_NITKU_TO_SAP,
    c.NITKU CUSTOMER_TIN,
    cts.NITKU CUSTOMER_TIN_TO_SAP,
    cts.CUSTOMER_MDM AS CUSTOMER_MDM_TO_SAP,
    cts.CUSTOMER_SAP_AR AS CUSTOMER_SAP_AR_TO_SAP,
    c.ADDRESS CUSTOMER_ADDRESS,
    c.NPWP CUSTOMER_NPWP,
    c.PROFIT_CENTER CUSTOMER_PROFIT_CENTER,
    cts.PROFIT_CENTER CUSTOMER_PROFIT_CENTER_TO_SAP,
    b.COGS,
    a.BILLING_CODE,
    a.DOC_NUMBER,
    a.INT_NUMBER,
    a.TERMIN,
    a.DESC_TERMIN,
    a.NO_INTEGRASI,
    a.REAL_BILLING AS NOMINAL_REALISASI,
    (a.REAL_PERIODE_BILLING || '-' || a.REAL_BULAN_BILLING) AS REAL_PERIODE_BILLING,
    d.PORTOFOLIO,
    CONCAT(to_char(b.MARGIN_PRESENTASE),'%') AS "MARGIN_PRESENTASE",
    e.BILLING_REVENUE_ID,
    e.STATUS_PYMAD,
    e.NOMINAL_PYMAD,
    e.TANGGAL_BAST,
    e.NO_INVOICE,
    e.TANGGAL_INVOICE,
    e.TANGGAL_POSTING,
    e.STATUS_INVOICE,
    e.STATUS_KELENGKAPAN_DOKUMEN,
    e.NOMINAL_INVOICE,
    e.NO_FAKTUR,
    e.TANGGAL_FAKTUR,
    e.STATUS_PELUNASAN,
    e.NOMINAL_PELUNASAN,
    e.TANGGAL_PELUNASAN,
    e.DENDA_PAJAK,
    e.PPH,
    e.NOMINAL_DPP,
    (SELECT KD_REF FROM N2N.M_REFERENSI mm WHERE mm.JNS_REF = 'tarif_ppn' AND SYSDATE BETWEEN mm.START_DATE AND mm.END_DATE) AS PPN,
    e.PPN_TARIF,
    c.WAPU,
    c.KOTA,
    e.BIAYA_LAIN,
    e.OUTSTANDING,
    e.KODE_BAYAR,
    e.FLAG_FAKTUR,
    st.DOKUMEN_ID AS ID_SURAT_TAGIHAN,
    st.NO_REF,
    st.NO_DOKUMEN AS NO_SURAT_TAGIHAN,
    CASE 
        WHEN ST.URL_DOKUMEN IS NOT NULL AND SUBSTR(ST.URL_DOKUMEN, 1, 5) = 'https' 
            THEN ST.URL_DOKUMEN 
        WHEN ST.URL_DOKUMEN IS NOT NULL AND SUBSTR(ST.URL_DOKUMEN, 1, 5) != 'https'
            THEN CONCAT('${LINK_DOK}', ST.URL_DOKUMEN) 
        ELSE ST.URL_DOKUMEN 
    END AS URL_SURAT_TAGIHAN,
    st.TGL_DOKUMEN AS TGL_SURAT_TAGIHAN,
    st.NOTES AS NOTE_SURAT_TAGIHAN,
    st.JSON_DOK,
    st.FLAG_DELETE AS VALID_SURAT_TAGIHAN,
    st.CREATED_BY AS CREATED_SURAT_TAGIHAN,
    st.CREATED_AT AS DATE_SURAT_TAGIHAN,
    a.BILLING_ID,
    f.URAIAN AS "URAIAN_STATUS",
    a.KD_STATUS,
    bs.KD_STATUS AS KD_STATUS_PREV,
    y.DETAIL_CHILD,
    CASE WHEN (SELECT COUNT(BILLING_ID) FROM D_BILLING WHERE PARENT_ID = a.BILLING_ID) > 0 THEN 1 ELSE 0 END AS FLAG_CHILD,
    CASE WHEN (SELECT COUNT(dps.PROJECT_ID) FROM D_PROJECT_STATUS dps WHERE dps.PROJECT_ID = a.BILLING_ID AND dps.KD_STATUS = '402') > 0 THEN 1 ELSE 0 END AS FLAG_PYMAD,
    LSI.TGL_INVOICE,
    LSI.PERIODE_INVOICE,
    VID.KETERLAMBATAN_INVOICE,
    (SELECT TO_CHAR(MAX(dps.DATE_STATUS), 'YYYY-MM-DD') 
            FROM D_PROJECT_STATUS dps 
            WHERE dps.PROJECT_ID = a.BILLING_ID 
              AND dps.KD_STATUS = '301') AS TANGGAL_SUBMIT,
    ss.NIP_DELIVERY,
    (SELECT 
            CASE 
                WHEN INSTR(CREATED_BY, '-') > 0 THEN
                    REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2) 
                ELSE CREATED_BY 
            END 
    FROM (SELECT CREATED_BY FROM D_PROJECT_STATUS x1 WHERE x1.PROJECT_ID = a.BILLING_ID AND x1.KD_STATUS = '301' ORDER BY DATE_STATUS DESC) WHERE ROWNUM = 1) AS NAMA_DELIVERY,
    CASE
    WHEN SUBSTR(e.NO_INVOICE, 1, 1) = '5' THEN
        (
        SELECT SUM(rtd.PRICE * rtd.JENIS_PPH / 100)
        FROM R_TRANSACTION_DETAIL rtd
        JOIN R_TRANSACTION rt
            ON rt.TRANSACTION_ID = rtd.TRANSACTION_ID
        WHERE rt.BILLING_ID = a.BILLING_ID
            AND rt.POSTING_RESPONSE = 'S'
        )
    ELSE
        (
        SELECT SUM(jt.amount * jt.pph / 100)
        FROM D_DOKUMEN dd
        JOIN D_BILLING_DOKUMEN dbd
            ON dd.DOKUMEN_ID = dbd.DOKUMEN_ID
        JOIN D_BILLING dbi
            ON dbi.BILLING_ID = dbd.BILLING_ID
        CROSS JOIN JSON_TABLE(
            dd.JSON_DOK,
            '$.payload'
            COLUMNS (
            NESTED PATH '$.details[*]'
            COLUMNS (
                amount NUMBER PATH '$.amount',
                pph    NUMBER PATH '$.pph'
            )
            )
        ) jt
        WHERE dbi.BILLING_ID = a.BILLING_ID
            AND dd.FLAG_DELETE = 'F'
            AND dd.JNS_DOKUMEN = '01004'
        )
    END AS PPH_VALUE,
    mr1.UR_REF AS KATEGORI_PROJECT,
    mr2.UR_REF AS PROJECT_MODEL,
    b.NILAI_KONTRAK,
    b.MARGIN_KONTRAK,
    (SELECT STATUS_ID FROM D_PROJECT_STATUS dps WHERE dps.PROJECT_ID = a.BILLING_ID AND dps.KD_STATUS = a.KD_STATUS ORDER BY dps.DATE_STATUS DESC FETCH FIRST 1 ROW ONLY) AS STATUS_ID,
    (SELECT FLAG_NEW_DOK FROM D_PROJECT_STATUS dps WHERE dps.PROJECT_ID = a.BILLING_ID AND dps.KD_STATUS = '402' ORDER BY dps.DATE_STATUS DESC FETCH FIRST 1 ROW ONLY) AS FLAG_NEW_DOK,
    g.PID_PO,
    CASE
        WHEN mr7.NO_DOKUMEN IS NOT NULL THEN
            'https://p2p.pelindo.co.id/index.php/app?key=' ||
            (
                SELECT UTL_RAW.CAST_TO_VARCHAR2(
                        UTL_ENCODE.BASE64_ENCODE(
                            UTL_RAW.CAST_TO_RAW('sys_' || TO_CHAR(SYSDATE, 'DDMMYYYY'))
                        )
                    )
                FROM dual
            ) ||
            '&param_kat=PI&param_doc=' || mr7.NO_DOKUMEN ||
            '&param_year=' || TO_CHAR(mr7.TGL_DOKUMEN, 'YYYY') ||
            '&param_company=' || c.COMP_CODE
        ELSE NULL
    END AS URL_P2P 
FROM N2N.D_BILLING a 
JOIN N2N.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID 
JOIN N2N.M_CUSTOMER c ON c.CUSTOMER_ID = b.CUSTOMER_ID
JOIN N2N.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = b.PORTOFOLIO_ID 
LEFT JOIN M_REFERENSI mr1 ON mr1.KD_REF = b.CATEGORY_ID AND mr1.JNS_REF = 'category_id'
LEFT JOIN M_REFERENSI mr2 ON mr2.KD_REF = b.PROJECT_MODEL_ID AND mr2.JNS_REF = 'category_project'
LEFT JOIN SUBMITED_STATUS ss ON a.BILLING_ID = ss.PROJECT_ID 
LEFT JOIN SURAT_TAGIHAN st ON st.BILLING_ID = a.BILLING_ID 
LEFT JOIN DOKUMEN_MIR7 mr7 ON mr7.BILLING_ID = a.BILLING_ID 
LEFT JOIN BILLING_STATUS bs ON bs.PROJECT_ID = a.BILLING_ID 
AND bs.rn = (CASE WHEN a.KD_STATUS IN ('405','401') THEN 3 ELSE 2 END)
LEFT JOIN N2N.D_BILLING_REVENUE e ON e.BILLING_ID = a.BILLING_ID 
LEFT JOIN CUSTOMER_TO_SAP cts ON cts.BILLING_ID = a.BILLING_ID 
LEFT JOIN VSLA_INV_DELAY VID ON VID.BILLING_ID = a.BILLING_ID 
LEFT JOIN LATEST_STATUS_INVOICE LSI ON LSI.PROJECT_ID = a.BILLING_ID 
LEFT JOIN N2N.M_STATUS f ON f.KD_STATUS = a.KD_STATUS AND f.ID_TAB_STATUS = 'FN1' 
LEFT JOIN (SELECT
        bl.PARENT_ID,
        JSON_ARRAYAGG(
            JSON_OBJECT('BILLING_ID' VALUE bl.BILLING_ID,
                        'PROJECT_ID' VALUE bl.PROJECT_ID,
                        'TERMIN' VALUE bl.TERMIN,
                        'DESC_TERMIN' VALUE bl.DESC_TERMIN,
                        'KETERANGAN' VALUE bl.KETERANGAN,
                        'EST_BILLING' VALUE bl.EST_BILLING,
                        'EST_BULAN_BILLING' VALUE bl.EST_BULAN_BILLING,
                        'EST_PERIODE_BILLING' VALUE bl.EST_PERIODE_BILLING,
                        'REAL_BILLING' VALUE bl.REAL_BILLING,
                        'REAL_BULAN_BILLING' VALUE bl.REAL_BULAN_BILLING,
                        'REAL_PERIODE_BILLING' VALUE bl.REAL_PERIODE_BILLING,
                        'STATUS_BILLING' VALUE CASE 
                                                WHEN bl.KD_STATUS = '304' THEN
                                                    'Faktur Done' 
                                                WHEN bl.KD_STATUS = '303' THEN
                                                    'Req. Faktur' 
                                                WHEN bl.KD_STATUS = '302' THEN
                                                    'Rejected' 
                                                WHEN bl.KD_STATUS = '301' THEN
                                                    'Submitted' 
                                                WHEN bl.KD_STATUS = '400' THEN
                                                    'Invoice' 
                                                WHEN bl.KD_STATUS = '401' THEN
                                                    'Paid' 
                                                WHEN bl.KD_STATUS = '402' THEN
                                                    'PYMAD' 
                                                WHEN bl.KD_STATUS = '403' THEN
                                                    'Completed' 
                                                ELSE '-'
                                            END)
                         RETURNING CLOB) DETAIL_CHILD
    FROM N2N.D_BILLING bl GROUP BY bl.PARENT_ID) y ON y.PARENT_ID = a.BILLING_ID 
LEFT JOIN D_PROJECT_PO g ON g.PROJECT_ID = a.PROJECT_ID AND g.PO_KODE = a.DIVISI_ID
WHERE
    a.BILLING_ID = :billing_id`

query.getDetailDataBilling = `
SELECT
    a.*,b.NOMINAL_INVOICE FROM D_BILLING a LEFT JOIN D_BILLING_REVENUE b ON a.BILLING_ID = b.BILLING_ID 
WHERE
    a.BILLING_ID = :billing_id`

// ini yang lama
// query.getListReportRevenue = `
// WITH D_EST_BILL AS (SELECT A.PROJECT_ID,
//                            A.EST_BILLING,
//                            A.REAL_BILLING,
//                            A.TERMIN,
//                            A.DESC_TERMIN,
//                            A.EST_BULAN_BILLING || '-' || A.EST_PERIODE_BILLING AS EST_BILLING_DATE,
//                            (SELECT COUNT(*) FROM D_PROJECT_STATUS dps WHERE dps.PROJECT_ID = A.BILLING_ID AND dps.KD_STATUS = '402') AS FLAG_PYMAD 
//                     FROM D_BILLING A
//                     WHERE A.EST_BULAN_BILLING || '-' || A.EST_PERIODE_BILLING <= :month
//                       AND A.EST_BULAN_BILLING IS NOT NULL
//                       AND ((A.EST_BULAN_BILLING || '-' || A.EST_PERIODE_BILLING < :month AND A.REAL_BILLING IS NULL)
//                         OR
//                            (A.EST_BULAN_BILLING || '-' || A.EST_PERIODE_BILLING = :month)))
// SELECT A.PROJECT_ID,
//        A.PROJECT_NO,
//        A.PROJECT_NAME,
//        C.CUSTOMER_NAME,
//        B.TERMIN,
//        B.DESC_TERMIN,
//        D.PORTOFOLIO,
//        B.EST_BILLING,
//        B.REAL_BILLING,
//        B.EST_BILLING_DATE,
//        B.FLAG_PYMAD 
// FROM D_PROJECT A
//          JOIN D_EST_BILL B ON B.PROJECT_ID = A.PROJECT_ID
//          JOIN M_CUSTOMER C ON C.CUSTOMER_ID = A.CUSTOMER_ID
//          JOIN M_PORTOFOLIO D ON D.PORTOFOLIO_ID = A.PORTOFOLIO_ID 
// ORDER BY C.KODE_AKUN ASC, B.EST_BILLING_DATE DESC;`

// 23 / 01 / 2026
// query.getListReportRevenue = `
// WITH PROJECTD AS (SELECT A1.PROJECT_ID,
//     A1.CUSTOMER_ID,
//     A1.PORTOFOLIO_ID,
//     A1.PROJECT_NO,
//     A1.PROJECT_NAME,
//     A1.KD_SPUC,
//     A1.COGS,
//     A1.NILAI_KONTRAK,
//     A1.MARGIN_KONTRAK,
//     A1.MARGIN_PENAWARAN,
//     A1.MARGIN_PRESENTASE,
//    -- trunc((1-(A1.COGS / A1.NILAI_KONTRAK))*100) AS MARGIN
//    TO_CHAR(round(((1-(A1.COGS / NULLIF(A1.NILAI_KONTRAK, 0)))*100), 2), 'FM999990.00') AS MARGIN
// FROM D_PROJECT A1)
// SELECT Z.* FROM (
// SELECT
//     A.BILLING_CODE,
//     C.PROJECT_NO,
//     C.PROJECT_NAME,
//     M1.CUSTOMER_NAME,
//     P.PORTOFOLIO,
//     C.KD_SPUC,
//     A.TERMIN,
//     A.DESC_TERMIN,
//     CASE WHEN M1.WAPU = 'Y' THEN 'YES' ELSE 'NO' END AS WAPU,
//     CASE 
//         WHEN A.KD_STATUS IN ('402', '403') THEN B.NOMINAL_PYMAD 
//         WHEN A.KD_STATUS IN ('400', '401', '405') THEN B.NOMINAL_DPP
//         WHEN A.KD_STATUS IN ('301') AND B.NOMINAL_DPP IS NOT NULL THEN B.NOMINAL_PYMAD 
//         ELSE A.REAL_BILLING 
//     END AS HARGA_JUAL,
//     TO_CHAR(TO_DATE(A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 'MM-YYYY'), 'Mon-YYYY') AS PERIODE_REALISASI,
//     CASE
//         WHEN A.KD_STATUS IN ('301', '302') THEN '-'
//     ELSE 
//     CASE WHEN (
//         SELECT
//             COUNT(dps.PROJECT_ID)
//         FROM
//             D_PROJECT_STATUS dps
//             WHERE
//             dps.PROJECT_ID = A.BILLING_ID
//             AND dps.KD_STATUS = '402') > 0 THEN 'YES' ELSE 'NO' END
//     END AS PYMAD,
//     CASE
//         WHEN B.FLAG_FAKTUR = 'Y' THEN 'YES'
//         WHEN B.FLAG_FAKTUR = 'N' THEN 'NO'
//     ELSE '-'
//     END AS WAJIB_FAKTUR,
//     B.NO_FAKTUR,
//     TO_CHAR(CAST(B.TANGGAL_FAKTUR AS DATE), 'DD/MM/YYYY') AS TANGGAL_FAKTUR,
//     CASE
//         WHEN A.KD_STATUS = '402' THEN 'PYMAD'
//         WHEN A.KD_STATUS = '403' THEN 'COMPLETED'
//         WHEN A.KD_STATUS = '400' THEN 'INVOICE'
//         WHEN A.KD_STATUS = '405' THEN 'SURAT TAGIHAN'
//         WHEN A.KD_STATUS = '401' THEN 'PAID'
//         WHEN A.KD_STATUS = '301' THEN 'SUBMITED'
//         WHEN A.KD_STATUS = '302' THEN 'REJECTED'
//     ELSE '-'
//     END AS STATUS,
//     CASE 
//         WHEN A.KD_STATUS IN ('402', '403') THEN TRUNC((1 - (C.MARGIN / 100)) * (B.NOMINAL_PYMAD)) 
//         WHEN A.KD_STATUS IN ('400', '401', '405') THEN TRUNC((1 - (C.MARGIN / 100)) * (B.NOMINAL_DPP))
//         WHEN A.KD_STATUS IN ('301') AND B.NOMINAL_DPP IS NOT NULL THEN TRUNC((1 - (C.MARGIN / 100)) * (B.NOMINAL_PYMAD))  
//         ELSE TRUNC((1 - (C.MARGIN / 100)) * (A.REAL_BILLING)) 
//     END AS COGS_FINAL,
//     --CASE 
//         --WHEN A.KD_STATUS = '402' THEN 
//         --WHEN B.NOMINAL_DPP IS NULL THEN TRUNC((1 - (C.MARGIN / 100)) * (A.REAL_BILLING))
//     --ELSE TRUNC((1 - (C.MARGIN / 100)) * (B.NOMINAL_DPP))
//     --END AS COGS_FINAL,
//     C.MARGIN AS MARGIN_FINAL,
//     CASE 
//         WHEN A.KD_STATUS IN ('402', '403') THEN TRUNC(C.MARGIN * (B.NOMINAL_PYMAD) / 100) 
//         WHEN A.KD_STATUS IN ('400', '401', '405') THEN TRUNC(C.MARGIN * (B.NOMINAL_DPP) / 100)
//         WHEN A.KD_STATUS IN ('301') AND B.NOMINAL_DPP IS NOT NULL THEN TRUNC(C.MARGIN * (B.NOMINAL_PYMAD) / 100)  
//         ELSE TRUNC(C.MARGIN * (A.REAL_BILLING) / 100)
//     END AS LABA_FINAL,
//     --CASE 
//         --WHEN A.KD_STATUS = '402' THEN TRUNC(C.MARGIN * (B.NOMINAL_PYMAD) / 100)
//         --WHEN B.NOMINAL_DPP IS NULL THEN TRUNC(C.MARGIN * (A.REAL_BILLING) / 100)
//     --ELSE TRUNC(C.MARGIN * (B.NOMINAL_DPP) / 100)
//     --END AS LABA_FINAL,
//     LDN.LOP_DETAIL_ID  
// FROM
//     D_BILLING A
// LEFT JOIN D_BILLING_REVENUE B ON
//     A.BILLING_ID = B.BILLING_ID
// JOIN PROJECTD C ON
//     C.PROJECT_ID = A.PROJECT_ID
// LEFT JOIN M_CUSTOMER M1 ON
//     M1.CUSTOMER_ID = COALESCE(B.CUSTOMER_ID_TO_SAP, C.CUSTOMER_ID)  
// LEFT JOIN M_PORTOFOLIO P ON 
//     P.PORTOFOLIO_ID = C.PORTOFOLIO_ID 
// LEFT JOIN A_LOP_DETAIL LDN ON 
//     LDN.BILLING_ID = A.BILLING_ID 
// WHERE 
// 	((A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING) = :month AND A.KD_STATUS NOT IN ('302') AND A.KD_STATUS IS NOT NULL AND A.FLAG_PARENT IN (1) AND (SELECT COUNT(BILLING_ID) FROM D_BILLING WHERE PARENT_ID = A.BILLING_ID) = 0) 
//     OR 
//     ((A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING) = :month AND A.KD_STATUS NOT IN ('302') AND A.KD_STATUS IS NOT NULL AND A.FLAG_PARENT IN (0))
// UNION 
// SELECT
//     '' AS BILLING_CODE,
//     C.PROJECT_NO,
//     C.PROJECT_NAME,
//     M1.CUSTOMER_NAME,
//     P.PORTOFOLIO,
//     C.KD_SPUC,
//     '' AS TERMIN,
//     '' AS DESC_TERMIN,
//     CASE WHEN M1.WAPU = 'Y' THEN 'YES' ELSE 'NO' END AS WAPU,
//     CASE 
//         WHEN A.KD_STATUS = '402' THEN B.NOMINAL_PYMAD
//         WHEN B.NOMINAL_DPP IS NULL THEN A.REAL_BILLING
//     ELSE B.NOMINAL_DPP
//     END AS HARGA_JUAL,
//     TO_CHAR(TO_DATE(A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 'MM-YYYY'), 'Mon-YYYY') AS PERIODE_REALISASI,
//     CASE
//         WHEN A.KD_STATUS IN ('301', '302') THEN '-'
//     ELSE '-' END AS PYMAD,
//     CASE
//         WHEN B.FLAG_FAKTUR = 'Y' THEN 'YES'
//         WHEN B.FLAG_FAKTUR = 'N' THEN 'NO'
//     ELSE '-'
//     END AS WAJIB_FAKTUR,
//     '' AS NO_FAKTUR,
//     '' AS TANGGAL_FAKTUR,
//     CASE
//         WHEN A.KD_STATUS = '402' THEN 'PYMAD'
//         WHEN A.KD_STATUS = '403' THEN 'COMPLETED'
//         WHEN A.KD_STATUS = '400' THEN 'INVOICE'
//         WHEN A.KD_STATUS = '405' THEN 'SURAT TAGIHAN'
//         WHEN A.KD_STATUS = '401' THEN 'PAID'
//         WHEN A.KD_STATUS = '301' THEN 'SUBMITED'
//         WHEN A.KD_STATUS = '302' THEN 'REJECTED'
//     ELSE '-'
//     END AS STATUS,
//     TRUNC((1 - (C.MARGIN / 100)) * (A.REAL_BILLING)) AS COGS_FINAL,
//     C.MARGIN AS MARGIN_FINAL,
//     TRUNC(C.MARGIN * (A.REAL_BILLING) / 100) AS LABA_FINAL,
//     '' AS LOP_DETAIL_ID  
// FROM
// D_BILLING_ADJUSTMENT A
// LEFT JOIN D_BILLING_REVENUE B ON
//     A.BILLING_ID = B.BILLING_ID
// JOIN PROJECTD C ON
//     C.PROJECT_ID = A.PROJECT_ID
// LEFT JOIN M_CUSTOMER M1 ON
//     M1.CUSTOMER_ID = C.CUSTOMER_ID 
// LEFT JOIN M_PORTOFOLIO P ON 
//     P.PORTOFOLIO_ID = C.PORTOFOLIO_ID 
// WHERE 
// 	(A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING) = :month  
// ) Z 
// ORDER BY
// 	Z.PERIODE_REALISASI ASC;`

// new 23 / 01 / 2025
query.getListReportRevenue = `
WITH DPROJECT AS (
SELECT
	PROJECT_ID,
	PROJECT_NO,
	PROJECT_NAME,
	CUSTOMER_ID,
	PORTOFOLIO_ID,
	KD_SPUC,
	ROUND((1 - (COGS / NULLIF(NILAI_KONTRAK, 0))) * 100, 2) AS MARGIN
FROM
	D_PROJECT),
     DOK_INV AS (
SELECT
	PROJECT_ID AS BILLING_ID,
	TO_CHAR(CREATED_AT, 'YYYYMM') AS PERIODE,
	NO_DOKUMEN,
	NO_REF,
	VALUE_DOK AS NILAI_INV,
	FLAG_DELETE
FROM
	D_DOKUMEN
WHERE
	JNS_DOKUMEN = '01004'
	AND TIPE_DOKUMEN = '01'),
     INV_BATAL AS (
SELECT
	*
FROM
	DOK_INV
WHERE
	FLAG_DELETE = 'T'),
     INV_GANTI AS (
SELECT
	*
FROM
	DOK_INV
WHERE
	FLAG_DELETE = 'F'),
     BASE_PYMAD AS (
SELECT
	A.BILLING_ID,
	CONCAT(A.REAL_PERIODE_BILLING, A.REAL_BULAN_BILLING) AS PERIODE,
	B.NOMINAL_PYMAD,
	A.EST_BILLING,
	B.STATUS_PYMAD,
	B.FLAG_FAKTUR,
	B.NO_FAKTUR,
	TO_CHAR(B.TANGGAL_FAKTUR, 'DD/MM/YYYY') AS TANGGAL_FAKTUR,
	UPPER(C.URAIAN) AS STATUS,
	A.TERMIN,
	A.DESC_TERMIN
FROM
	D_BILLING A
JOIN D_BILLING_REVENUE B ON
	B.BILLING_ID = A.BILLING_ID
JOIN M_STATUS C ON
	C.KD_STATUS = A.KD_STATUS),
     EV_PYMAD AS (
SELECT
	BILLING_ID,
	PERIODE,
	NOMINAL_PYMAD AS NILAI_REVENUE,
	EST_BILLING AS NILAI_ESTIMASI,
	'PYMAD' AS EVENT_TYPE,
	'NORMAL' AS REVENUE_TYPE,
	NULL AS ADJUST_FROM,
	NULL AS ADJUST_TO,
	FLAG_FAKTUR,
	NO_FAKTUR,
	TANGGAL_FAKTUR,
	STATUS,
	TERMIN,
	DESC_TERMIN
FROM
	BASE_PYMAD
WHERE
	STATUS_PYMAD = 'T'),
     EV_INV_BATAL AS (
SELECT
	P.BILLING_ID,
	I.PERIODE,
	CASE
		WHEN P.STATUS_PYMAD = 'T'
                                     THEN P.NOMINAL_PYMAD - I.NILAI_INV
		ELSE
                                     I.NILAI_INV
	END AS NILAI_REVENUE,
	0 AS NILAI_ESTIMASI,
	'INV_BATAL' AS EVENT_TYPE,
	CASE
		WHEN P.STATUS_PYMAD = 'T' THEN 'ADJUSTMENT'
		ELSE 'NORMAL'
	END AS REVENUE_TYPE,
	CASE
		WHEN P.STATUS_PYMAD = 'T' THEN 'PYMAD'
		ELSE NULL
	END AS ADJUST_FROM,
	'INV_BATAL' AS ADJUST_TO,
	P.FLAG_FAKTUR,
	P.NO_FAKTUR,
	P.TANGGAL_FAKTUR,
	STATUS,
	TERMIN,
	DESC_TERMIN
FROM
	BASE_PYMAD P
JOIN INV_BATAL I ON
	I.BILLING_ID = P.BILLING_ID),
     EV_INV_GANTI AS (
SELECT
	P.BILLING_ID,
	G.PERIODE,
	G.NILAI_INV - I.NILAI_INV AS NILAI_REVENUE,
	0 AS NILAI_ESTIMASI,
	'INV_GANTI' AS EVENT_TYPE,
	'ADJUSTMENT' AS REVENUE_TYPE,
	'INV_BATAL' AS ADJUST_FROM,
	'INV_GANTI' AS ADJUST_TO,
	P.FLAG_FAKTUR,
	P.NO_FAKTUR,
	P.TANGGAL_FAKTUR,
	P.STATUS,
	P.TERMIN,
	P.DESC_TERMIN
FROM
	BASE_PYMAD P
JOIN INV_BATAL I ON
	I.BILLING_ID = P.BILLING_ID
JOIN INV_GANTI G ON
	I.NO_REF = G.NO_DOKUMEN
WHERE
	(G.NILAI_INV - I.NILAI_INV) <> 0),
     ALL_EVENT AS (
SELECT
	*
FROM
	EV_PYMAD
UNION ALL
SELECT
	*
FROM
	EV_INV_BATAL
UNION ALL
SELECT
	*
FROM
	EV_INV_GANTI)
SELECT
	E.BILLING_ID,
	TO_CHAR(TO_DATE(E.PERIODE, 'YYYYMM'), 'MON-YYYY', 'NLS_DATE_LANGUAGE=INDONESIAN') AS PERIODE_TAMPIL,
	B.BILLING_CODE,
	P.PROJECT_NO,
	P.PROJECT_NAME,
	CASE
		WHEN BR.CUSTOMER_ID_TO_SAP IS NOT NULL 
            THEN C2.CUSTOMER_NAME
		ELSE C.CUSTOMER_NAME
	END AS CUSTOMER_NAME,
	CASE
		WHEN BR.CUSTOMER_ID_TO_SAP IS NOT NULL 
            THEN C2.WAPU
		ELSE C.WAPU
	END AS WAPU,
	E.STATUS,
	E.TERMIN,
	E.DESC_TERMIN,
	PF.PORTOFOLIO,
	P.KD_SPUC,
	E.NILAI_REVENUE,
	E.NILAI_ESTIMASI,
	P.MARGIN,
	TRUNC((1 - (P.MARGIN / 100)) * E.NILAI_REVENUE) AS COGS_FINAL,
	TRUNC((1 - (P.MARGIN / 100)) * E.NILAI_ESTIMASI) AS COGS_FINAL_ESTIMASI,
	E.NILAI_REVENUE - TRUNC((1 - (P.MARGIN / 100)) * E.NILAI_REVENUE) AS LABA_FINAL,
	E.NILAI_ESTIMASI - TRUNC((1 - (P.MARGIN / 100)) * E.NILAI_ESTIMASI) AS LABA_FINAL_ESTIMASI,
	BR.STATUS_PYMAD,
	ALD.LOP_DETAIL_ID,
	E.FLAG_FAKTUR,
	REGEXP_REPLACE(E.NO_FAKTUR, '[^0-9]', '') AS NO_FAKTUR,
	E.TANGGAL_FAKTUR,
	E.EVENT_TYPE,
	E.REVENUE_TYPE
FROM
	ALL_EVENT E
JOIN D_BILLING B ON
	B.BILLING_ID = E.BILLING_ID
JOIN D_BILLING_REVENUE BR ON
	BR.BILLING_ID = E.BILLING_ID
JOIN DPROJECT P ON
	P.PROJECT_ID = B.PROJECT_ID
JOIN M_CUSTOMER C ON
	C.CUSTOMER_ID = P.CUSTOMER_ID
JOIN M_PORTOFOLIO PF ON
	PF.PORTOFOLIO_ID = P.PORTOFOLIO_ID
LEFT JOIN A_LOP_DETAIL ALD ON
	ALD.BILLING_ID = E.BILLING_ID AND ALD.FLAG_DELETE = 'F' 
LEFT JOIN M_CUSTOMER C2 ON
	C2.CUSTOMER_ID = BR.CUSTOMER_ID_TO_SAP
WHERE
	E.PERIODE = :p_periode
	AND 
E.BILLING_ID NOT IN (
	SELECT
		DPS.PROJECT_ID
	FROM
		D_PROJECT_STATUS DPS
	WHERE
		DPS.PROJECT_ID = E.BILLING_ID
		AND DPS.KD_STATUS = '302'
		AND TO_CHAR(DPS.DATE_STATUS, 'YYYYMM') = :p_periode
			AND (
			SELECT
				DPSS.KD_STATUS
			FROM
				D_PROJECT_STATUS DPSS
			WHERE
				DPSS.PROJECT_ID = E.BILLING_ID
			ORDER BY
				DPSS.DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) = '302'
	UNION
		SELECT
			DPS.PROJECT_ID
		FROM
			D_PROJECT_STATUS DPS
		WHERE
			DPS.PROJECT_ID = E.BILLING_ID
			AND DPS.KD_STATUS = '302'
			AND TO_CHAR(DPS.DATE_STATUS, 'YYYYMM') = :p_periode
				AND (
				SELECT
					DPSS.KD_STATUS
				FROM
					D_PROJECT_STATUS DPSS
				WHERE
					DPSS.PROJECT_ID = E.BILLING_ID
				ORDER BY
					DPSS.DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) != '302'
				AND (
				SELECT
					TO_CHAR(DPSS.DATE_STATUS, 'YYYYMM')
				FROM
					D_PROJECT_STATUS DPSS
				WHERE
					DPSS.PROJECT_ID = E.BILLING_ID
					AND DPSS.KD_STATUS = '301'
				ORDER BY
					DPSS.DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) > :p_periode
)
ORDER BY
	E.BILLING_ID,
	E.EVENT_TYPE;
`;

query.getListReportAccrue = `
SELECT Z.* FROM (
    SELECT
	A.BILLING_CODE,
	C.PROJECT_NO,
	C.PROJECT_NAME,
	M1.CUSTOMER_NAME,
	P.PORTOFOLIO,
	C.KD_SPUC,
	A.TERMIN,
	A.DESC_TERMIN,
	M1.WAPU,
	A.REAL_BILLING AS NILAI_REVENUE,
	TO_CHAR(TO_DATE(A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 'MM-YYYY'), 'Mon-YYYY') AS PERIODE_REALISASI,
	CASE
		WHEN A.KD_STATUS IN ('301', '302') THEN '-'
		ELSE 
		CASE WHEN (
		SELECT
			COUNT(dps.PROJECT_ID)
		FROM
			D_PROJECT_STATUS dps
		WHERE
			dps.PROJECT_ID = A.BILLING_ID
			AND dps.KD_STATUS = '402') > 0 THEN 'Y' ELSE 'N' END
	END AS PYMAD,
	CASE
		WHEN B.FLAG_FAKTUR = 'Y' THEN 'Yes'
		WHEN B.FLAG_FAKTUR = 'N' THEN 'No'
		ELSE '-'
	END AS WAJIB_FAKTUR,
	CASE
		WHEN A.KD_STATUS = '402' THEN 'PYMAD'
		WHEN A.KD_STATUS = '403' THEN 'COMPLETED'
		WHEN A.KD_STATUS = '400' THEN 'INVOICE'
		WHEN A.KD_STATUS = '405' THEN 'SURAT_TAGIHAN'
		WHEN A.KD_STATUS = '401' THEN 'PAID'
		WHEN A.KD_STATUS = '301' THEN 'SUBMITED'
		WHEN A.KD_STATUS = '302' THEN 'REJECTED'
		ELSE '-'
	END AS STATUS
FROM
	D_BILLING A
LEFT JOIN D_BILLING_REVENUE B ON
	A.BILLING_ID = B.BILLING_ID
LEFT JOIN D_PROJECT C ON
	C.PROJECT_ID = A.PROJECT_ID
LEFT JOIN M_CUSTOMER M1 ON
	M1.CUSTOMER_ID = COALESCE(B.CUSTOMER_ID_TO_SAP, C.CUSTOMER_ID) 
LEFT JOIN M_PORTOFOLIO P ON 
    P.PORTOFOLIO_ID = C.PORTOFOLIO_ID 
WHERE 
	TO_CHAR((SELECT MAX(DATE_STATUS) FROM D_PROJECT_STATUS DPS WHERE DPS.PROJECT_ID = A.BILLING_ID AND DPS.KD_STATUS = '400'), 'MM-YYYY') = :month AND A.KD_STATUS NOT IN ('302') AND A.KD_STATUS IS NOT NULL 
) Z 
ORDER BY
	Z.PERIODE_REALISASI ASC;`

// query.getListReportReverse = `
// SELECT Z.* FROM (
//     SELECT
// 	A.BILLING_CODE,
// 	C.PROJECT_NO,
// 	C.PROJECT_NAME,
// 	M1.CUSTOMER_NAME,
// 	P.PORTOFOLIO,
// 	C.KD_SPUC,
// 	A.TERMIN,
// 	A.DESC_TERMIN,
// 	M1.WAPU,
// 	A.REAL_BILLING AS HARGA_JUAL,
// 	TO_CHAR(TO_DATE(A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 'MM-YYYY'), 'Mon-YYYY') AS PERIODE_REALISASI,
// 	CASE
// 		WHEN A.KD_STATUS IN ('301', '302') THEN '-'
// 		ELSE 
// 		CASE WHEN (
// 		SELECT
// 			COUNT(dps.PROJECT_ID)
// 		FROM
// 			D_PROJECT_STATUS dps
// 		WHERE
// 			dps.PROJECT_ID = A.BILLING_ID
// 			AND dps.KD_STATUS = '402') > 0 THEN 'Y' ELSE 'N' END
// 	END AS PYMAD,
// 	CASE
// 		WHEN B.FLAG_FAKTUR = 'Y' THEN 'Yes'
// 		WHEN B.FLAG_FAKTUR = 'N' THEN 'No'
// 		ELSE '-'
// 	END AS WAJIB_FAKTUR,
// 	CASE
// 		WHEN A.KD_STATUS = '402' THEN 'PYMAD'
// 		WHEN A.KD_STATUS = '403' THEN 'COMPLETED'
// 		WHEN A.KD_STATUS = '400' THEN 'INVOICE'
// 		WHEN A.KD_STATUS = '405' THEN 'SURAT_TAGIHAN'
// 		WHEN A.KD_STATUS = '401' THEN 'PAID'
// 		WHEN A.KD_STATUS = '301' THEN 'SUBMITED'
// 		WHEN A.KD_STATUS = '302' THEN 'REJECTED'
// 		ELSE '-'
// 	END AS STATUS
// FROM
// 	D_BILLING A
// LEFT JOIN D_BILLING_REVENUE B ON
// 	A.BILLING_ID = B.BILLING_ID
// LEFT JOIN D_PROJECT C ON
// 	C.PROJECT_ID = A.PROJECT_ID
// LEFT JOIN M_CUSTOMER M1 ON
// 	M1.CUSTOMER_ID = COALESCE(B.CUSTOMER_ID_TO_SAP, C.CUSTOMER_ID) 
// LEFT JOIN M_PORTOFOLIO P ON 
//     P.PORTOFOLIO_ID = C.PORTOFOLIO_ID 
// WHERE 
// 	(A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING) = :month AND A.KD_STATUS NOT IN ('302') AND A.KD_STATUS IS NOT NULL
// ) Z 
// ORDER BY
// 	Z.PERIODE_REALISASI ASC;`

query.getListReportReverse = `
SELECT DISTINCT
  Z.* 
FROM 
  (
    WITH LATEST_STATUS AS (
      SELECT 
        PROJECT_ID, 
        MAX(
          CASE WHEN KD_STATUS IN (
            '301', '302', '303', '304', '400', '401', 
            '402', '403', '406'
          ) THEN DATE_STATUS END
        ) AS LATEST_DATE_STATUS, 
        MAX(
          CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END
        ) AS SLA_KD_START, 
        MAX(
          CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END
        ) AS SLA_KD_END, 
        MAX(
          CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END
        ) AS SLA_SUBMIT_START, 
        MAX(
          CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END
        ) AS SLA_INVOICE_START, 
        MAX(
          CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END
        ) AS SLA_PAID, 
        MAX(
          CASE WHEN KD_STATUS = '303' THEN NOTES END
        ) AS KETERANGAN_REQ_FAKTUR, 
        MAX(
          CASE WHEN KD_STATUS = '302' THEN NOTES END
        ) AS KETERANGAN_REJECT, 
        MAX(
          CASE WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2) ELSE CREATED_BY END
        ) AS NAMA_DELIVERY 
      FROM 
        D_PROJECT_STATUS 
      WHERE 
        KD_STATUS IN (
          '301', '302', '303', '304', '400', '401', 
          '402', '403', '406'
        ) 
      GROUP BY 
        PROJECT_ID
    ), 
    STATUS_INVOICE AS (
      SELECT 
        dps.DATE_STATUS, 
        dps.PROJECT_ID 
      FROM 
        D_PROJECT_STATUS dps 
      WHERE 
        dps.KD_STATUS IN ('400')
    ), 
    PYMAD_DATA AS (SELECT 
      A.BILLING_CODE, 
      C.CUSTOMER_NAME, 
      D.PORTOFOLIO, 
      B.KD_SPUC, 
      B.PROJECT_NO, 
      B.PROJECT_NAME, 
      A.REAL_BILLING AS NILAI_REVENUE, 
      A.DOC_NUMBER, 
      TO_CHAR(
        LAST_DAY(
          TO_DATE(
            '01-' || A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 
            'DD-MM-YYYY'
          )
        ), 
        'DD-Mon-YYYY'
      ) AS GL_DATA_REVERSAL 
      ,'PYMAD' AS STATUS
    FROM 
      N2N.D_BILLING A 
      LEFT JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ID 
      LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID 
      LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID 
      LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID 
      LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = COALESCE(
        F.CUSTOMER_ID_TO_SAP, B.CUSTOMER_ID
      ) 
      LEFT JOIN STATUS_INVOICE SI ON SI.PROJECT_ID = A.BILLING_ID 
      LEFT JOIN N2N.M_STATUS G ON G.KD_STATUS = A.KD_STATUS 
      AND (
        G.ID_TAB_STATUS = 'FN1' 
        OR G.ID_TAB_STATUS = 'DL1'
      ) 
    WHERE 
      (
        (
          A.FLAG_PARENT = 1 
          AND A.PARENT_ID IS NULL 
          AND (
            SELECT 
              COUNT(db.BILLING_ID) 
            FROM 
              D_BILLING db 
            WHERE 
              db.PARENT_ID = A.BILLING_ID
          ) = 0
        ) 
        OR (
          A.FLAG_PARENT = 0 
          AND (
            SELECT 
              COUNT(db.BILLING_ID) 
            FROM 
              D_BILLING db 
            WHERE 
              db.BILLING_ID = A.PARENT_ID 
              AND db.FLAG_PARENT = 2
          ) = 0
        ) 
        OR A.FLAG_PARENT = 2
      ) 
      AND REGEXP_LIKE(
        TO_CHAR(A.REAL_BULAN_BILLING), 
        '^(0?[1-9]|1[0-2])$'
      ) 
      AND REGEXP_LIKE(
        TO_CHAR(A.REAL_PERIODE_BILLING), 
        '^[0-9]{4}$'
      ) 
      AND (
        SELECT 
          COUNT(dpss.STATUS_ID) 
        FROM 
          D_PROJECT_STATUS dpss 
        WHERE 
          dpss.PROJECT_ID = A.BILLING_ID 
          AND dpss.KD_STATUS = '402'
      ) > 0 
      AND A.KD_STATUS IN ('400', '405', '401') 
      AND TO_CHAR(SI.DATE_STATUS, 'MM-YYYY') = :month 
      AND TO_CHAR(TO_DATE(LPAD(A.REAL_BULAN_BILLING, 2, 0) || '-' || A.REAL_PERIODE_BILLING, 'MM-YYYY'), 'MM-YYYY') != TO_CHAR(SI.DATE_STATUS, 'MM-YYYY') 
      AND (
        TO_DATE(
          '01-' || LPAD(A.REAL_BULAN_BILLING, 2, 0) || '-' || A.REAL_PERIODE_BILLING, 
          'DD-MM-YYYY'
        ) <= TO_DATE('01-' || :month, 'DD-MM-YYYY')
      )
    ) 
    SELECT * FROM PYMAD_DATA 
    UNION ALL 
    SELECT 
      DBL.BILLING_CODE, 
      MC.CUSTOMER_NAME, 
      MP.PORTOFOLIO, 
      DP.KD_SPUC, 
      DP.PROJECT_NO, 
      DP.PROJECT_NAME, 
      RF.DPP AS NILAI_REVENUE, 
      DBL.DOC_NUMBER, 
      TO_CHAR(
        LAST_DAY(
          TO_DATE(
            '01-' || DBL.REAL_BULAN_BILLING || '-' || DBL.REAL_PERIODE_BILLING, 
            'DD-MM-YYYY'
          )
        ), 
        'DD-Mon-YYYY'
      ) AS GL_DATA_REVERSAL 
      ,'INVOICE' AS STATUS
    FROM 
      R_FINANCE RF 
      JOIN D_BILLING DBL ON DBL.BILLING_ID = RF.SOURCE_ID 
      JOIN D_PROJECT DP ON DP.PROJECT_ID = DBL.PROJECT_ID 
      JOIN M_CUSTOMER MC ON MC.CUSTOMER_ID = DP.CUSTOMER_ID 
      JOIN M_PORTOFOLIO MP ON MP.PORTOFOLIO_ID = DP.PORTOFOLIO_ID 
    WHERE 
      RF.EVENT_CODE = 'INVOICE' 
      AND IS_ACTIVE = 'N' 
      AND RF.PERIODE = TO_CHAR(
        TO_DATE(:month, 'MM-YYYY'), 
        'YYYYMM'
      )
        AND NOT EXISTS (
            SELECT 1
            FROM PYMAD_DATA P
            WHERE P.BILLING_CODE = DBL.BILLING_CODE
        )
  ) Z 
ORDER BY 
  Z.BILLING_CODE ASC;
`

query.getListReportAdjustment = `
SELECT Z.* FROM (
    SELECT
	'' BILLING_CODE,
	C.PROJECT_NO,
	C.PROJECT_NAME,
	M1.CUSTOMER_NAME,
	P.PORTOFOLIO,
	C.KD_SPUC,
	'' TERMIN,
	'' DESC_TERMIN,
	M1.WAPU,
	A.REAL_BILLING AS NILAI_ADJUST,
	TO_CHAR(TO_DATE(A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 'MM-YYYY'), 'Mon-YYYY') AS PERIODE_REALISASI,
	'' AS PYMAD,
	CASE
		WHEN B.FLAG_FAKTUR = 'Y' THEN 'Yes'
		WHEN B.FLAG_FAKTUR = 'N' THEN 'No'
		ELSE '-'
	END AS WAJIB_FAKTUR,
    A.REAL_PERIODE_BILLING AS YEAR,
	'ADJUSTMENT' AS STATUS
FROM
	D_BILLING_ADJUSTMENT A
LEFT JOIN D_BILLING_REVENUE B ON
	A.BILLING_ID = B.BILLING_ID
LEFT JOIN D_PROJECT C ON
	C.PROJECT_ID = A.PROJECT_ID
LEFT JOIN M_CUSTOMER M1 ON
	M1.CUSTOMER_ID = C.CUSTOMER_ID 
LEFT JOIN M_PORTOFOLIO P ON 
    P.PORTOFOLIO_ID = C.PORTOFOLIO_ID 
WHERE 
	(LPAD(A.REAL_BULAN_BILLING, 2, '0') || '-' || A.REAL_PERIODE_BILLING) = :month AND A.JNS_ADJUST = 'REVENUE'
) Z 
ORDER BY
	Z.PERIODE_REALISASI ASC;`

query.getListReportSummary = `
SELECT 
    (
    SELECT
        SUM(A.REAL_BILLING)
    FROM
        D_BILLING A 
    WHERE 
        (A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING) = :month AND A.KD_STATUS NOT IN ('302') AND A.KD_STATUS IS NOT NULL
    ) AS TOTAL_INVOICE,
    (
    SELECT
        SUM(A.REAL_BILLING)
    FROM
        D_BILLING A 
    WHERE 
        TO_CHAR((SELECT MAX(DATE_STATUS) FROM D_PROJECT_STATUS DPS WHERE DPS.PROJECT_ID = A.BILLING_ID AND DPS.KD_STATUS = '400'), 'MM-YYYY') = :month AND A.KD_STATUS NOT IN ('302') AND A.KD_STATUS IS NOT NULL 
    ) AS TOTAL_ACCRUE,
    0 AS TOTAL_REVERSE,
    0 AS TOTAL,
    0 AS PENYESUAIAN,
    0 AS TOTAL_REVENUE 
FROM DUAL;`

query.getTotalReportBillingRevenue = `
WITH EST_BILL_BEFORE AS (SELECT '1' AS             ID,
                                SUM(B.EST_BILLING) TOT_EST_BILL_BEFORE
                         FROM D_BILLING B
                         WHERE B.EST_BULAN_BILLING || '-' || B.EST_PERIODE_BILLING < :month
                           AND B.EST_BULAN_BILLING IS NOT NULL
                           AND B.REAL_BILLING IS NULL),
     EST_BILL AS (SELECT '1'                 AS ID,
                         SUM(A.EST_BILLING)  AS TOT_EST_BILL
                  FROM D_BILLING A
                  WHERE (A.EST_BULAN_BILLING || '-' || A.EST_PERIODE_BILLING = :month)
                    AND A.EST_BULAN_BILLING IS NOT NULL),
     REAL_BILL AS (SELECT '1' AS              ID,
                          SUM(B.REAL_BILLING) TOT_REAL_BILL
                   FROM D_BILLING B
                   WHERE B.REAL_BULAN_BILLING || '-' || B.REAL_PERIODE_BILLING = :month
                     AND B.REAL_BILLING IS NOT NULL)
SELECT B.TOT_EST_BILL,
       A.TOT_EST_BILL_BEFORE,
       (B.TOT_EST_BILL + A.TOT_EST_BILL_BEFORE)                   AS TOT_EST_SELURUH,
       C.TOT_REAL_BILL,
       (B.TOT_EST_BILL + A.TOT_EST_BILL_BEFORE - C.TOT_REAL_BILL) AS TOT_SISA
FROM EST_BILL_BEFORE A
         JOIN EST_BILL B ON B.ID = A.ID
         JOIN REAL_BILL C ON C.ID = A.ID;`

// query.getListReportTransaksi = `
// WITH BAST AS (SELECT a.TGL_DOKUMEN, a.CREATED_AT, b.BILLING_ID, a.CREATED_BY, ROW_NUMBER() OVER (PARTITION BY b.BILLING_ID ORDER BY a.CREATED_AT DESC) AS RN FROM D_DOKUMEN a INNER JOIN D_BILLING_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID WHERE a.JNS_DOKUMEN = '04006' ORDER BY a.CREATED_AT DESC)
// SELECT
// 	M1.CUSTOMER_NAME,
// 	DD.NO_DOKUMEN AS NO_INVOICE,
// 	C.PROJECT_NO,
// 	C.PROJECT_NAME,
// 	CASE
// 		WHEN A.KD_STATUS IN ('301', '302') THEN '-'
// 		ELSE 
// 		CASE WHEN (
// 		SELECT
// 			COUNT(dps.PROJECT_ID)
// 		FROM
// 			D_PROJECT_STATUS dps
// 		WHERE
// 			dps.PROJECT_ID = A.BILLING_ID
// 			AND dps.KD_STATUS = '402') > 0 THEN 'Y' ELSE 'N' END
// 	END AS STATUS_PYMAD,
//     A.BILLING_CODE,
//     A.DOC_NUMBER,
//     A.REAL_BILLING AS NILAI_PYMAD,
//     B.NOMINAL_DPP AS HARGA_JUAL,
//     (B.NOMINAL_DPP - A.REAL_BILLING) SELISIH,
//     B.PPN_TARIF PPN,
//     B.NOMINAL_INVOICE AS NILAI_TAGIHAN,
//     CASE WHEN M1.WAPU = 'Y' THEN 'Wapu' ELSE 'Non Wapu' END WAPU,
//     (SELECT SUM(PRICE * JENIS_PPH / 100) 
//         FROM R_TRANSACTION_DETAIL rtd 
//         JOIN R_TRANSACTION rt ON rt.TRANSACTION_ID = rtd.TRANSACTION_ID 
//     WHERE rt.BILLING_ID  = A.BILLING_ID AND rt.POSTING_RESPONSE = 'S') AS PPH,
//     --B.PPH,
//     '' NILAI_BAYAR,
//     A.REAL_PERIODE_BILLING YEAR,
//     TO_CHAR(B.TANGGAL_POSTING,'DD-Mon-YYYY') TGL_POSTING,
//     TO_CHAR((
//         SELECT MAX(dps.DATE_STATUS) FROM D_PROJECT_STATUS dps WHERE dps.KD_STATUS = '400' AND dps.PROJECT_ID = A.BILLING_ID FETCH FIRST 1 ROWS ONLY 
//     ),'DD-Mon-YYYY') TGL_CREATE_INVOICE,
//     TO_CHAR((
//         SELECT MAX(dps.DATE_STATUS) FROM D_PROJECT_STATUS dps WHERE dps.KD_STATUS = '401' AND dps.PROJECT_ID = A.BILLING_ID FETCH FIRST 1 ROWS ONLY 
//     ),'DD-Mon-YYYY') TGL_PAID,
//     '' AMOUNT_RECEIVE,
//     '' OUTSTANDING,
//     '' DIFFERENCE,
// 	CASE
// 		WHEN A.KD_STATUS = '401' THEN 'Paid'
// 		ELSE 'Unpaid'
// 	END AS STATUS_LUNAS,
//     TO_CHAR(BT.CREATED_AT, 'DD-Mon-YYYY') AS TGL_BAST,
//     TO_CHAR(A.CREATED_AT, 'DD-Mon-YYYY') AS TGL_CREATED,
//     BT.CREATED_BY AS CREATED_BAST,
//     TRUNC(CAST(BT.CREATED_AT AS DATE)) 
//     - TRUNC(CAST(A.CREATED_AT AS DATE)) AS SLA_BAST 
// FROM
// 	D_BILLING A
// LEFT JOIN D_BILLING_REVENUE B ON
// 	A.BILLING_ID = B.BILLING_ID 
// JOIN D_BILLING_DOKUMEN DBD ON 
//     DBD.BILLING_ID = A.BILLING_ID 
// JOIN D_DOKUMEN DD ON 
//     DD.DOKUMEN_ID = DBD.DOKUMEN_ID AND DD.JNS_DOKUMEN = '01004'  
// LEFT JOIN D_PROJECT C ON
// 	C.PROJECT_ID = A.PROJECT_ID
// LEFT JOIN M_CUSTOMER M1 ON
// 	M1.CUSTOMER_ID = COALESCE(B.CUSTOMER_ID_TO_SAP, C.CUSTOMER_ID)
// LEFT JOIN M_PORTOFOLIO P ON 
//     P.PORTOFOLIO_ID = C.PORTOFOLIO_ID 
// LEFT JOIN BAST BT ON BT.BILLING_ID = A.BILLING_ID AND BT.RN = 1 
// WHERE 
//     --(SELECT TO_CHAR(DPS.DATE_STATUS, 'MM-YYYY') FROM D_PROJECT_STATUS DPS WHERE DPS.KD_STATUS = '400' AND DPS.PROJECT_ID = A.BILLING_ID ORDER BY DPS.DATE_STATUS ASC FETCH FIRST 1 ROWS ONLY) = :month 
//     TO_CHAR(DD.CREATED_AT, 'MM-YYYY') = :month AND A.KD_STATUS NOT IN ('302') AND A.KD_STATUS IS NOT NULL 
//     --(SELECT COUNT(DPS.STATUS_ID) FROM D_PROJECT_STATUS DPS WHERE DPS.KD_STATUS = '400' AND DPS.--PROJECT_ID = A.BILLING_ID) > 1
//     --TO_CHAR(DD.CREATED_AT, 'MM-YYYY') = :month AND A.KD_STATUS NOT IN ('302') AND A.KD_STATUS IS --NOT NULL
// 	--(A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING) = :month AND A.KD_STATUS NOT IN ----('302') AND A.KD_STATUS IS NOT NULL 
// ORDER BY
// 	M1.KODE_AKUN ASC;`
// query.getListReportTransaksi = `
// SELECT
// 	M1.CUSTOMER_NAME,
// 	DD.NO_DOKUMEN AS NO_INVOICE,
// 	C.PROJECT_NO,
// 	C.PROJECT_NAME,
// 	CASE
// 		WHEN A.KD_STATUS IN ('301', '302') THEN '-'
// 		ELSE
//                CASE
// 			WHEN (
// 			SELECT
// 				COUNT(dps.PROJECT_ID)
// 			FROM
// 				D_PROJECT_STATUS dps
// 			WHERE
// 				dps.PROJECT_ID = A.BILLING_ID
// 				AND dps.KD_STATUS = '402') > 0 THEN 'Y'
// 			ELSE 'N'
// 		END
// 	END AS STATUS_PYMAD,
// 	A.BILLING_CODE,
//     A.DESC_TERMIN,
// 	A.DOC_NUMBER,
// 	A.REAL_BILLING AS NILAI_PYMAD,
// 	B.NOMINAL_DPP AS HARGA_JUAL,
// 	(B.NOMINAL_DPP - A.REAL_BILLING) SELISIH,
// 	B.PPN_TARIF PPN,
// 	B.NOMINAL_INVOICE AS NILAI_TAGIHAN,
// 	CASE
// 		WHEN M1.WAPU = 'Y' THEN 'Wapu'
// 		ELSE 'Non Wapu'
// 	END WAPU,
// 	(
// 	SELECT
// 		SUM(PRICE * JENIS_PPH / 100)
// 	FROM
// 		R_TRANSACTION_DETAIL rtd
// 	JOIN R_TRANSACTION rt ON
// 		rt.TRANSACTION_ID = rtd.TRANSACTION_ID
// 	WHERE
// 		rt.BILLING_ID = A.BILLING_ID
// 		AND rt.POSTING_RESPONSE = 'S') AS PPH,
// 	--B.PPH,
//        '' NILAI_BAYAR,
// 	A.REAL_PERIODE_BILLING YEAR,
// 	TO_CHAR(B.TANGGAL_POSTING, 'DD-Mon-YYYY') TGL_POSTING,
// 	TO_CHAR((SELECT MAX(dps.DATE_STATUS)
//                 FROM D_PROJECT_STATUS dps
//                 WHERE dps.KD_STATUS = '400'
//                   AND dps.PROJECT_ID = A.BILLING_ID FETCH FIRST 1 ROWS ONLY), 'DD-Mon-YYYY') TGL_CREATE_INVOICE,
// 	TO_CHAR((SELECT MAX(dps.DATE_STATUS)
//                 FROM D_PROJECT_STATUS dps
//                 WHERE dps.KD_STATUS = '401'
//                   AND dps.PROJECT_ID = A.BILLING_ID FETCH FIRST 1 ROWS ONLY), 'DD-Mon-YYYY') TGL_PAID,
// 	'' AMOUNT_RECEIVE,
// 	'' OUTSTANDING,
// 	'' DIFFERENCE,
// 	CASE
// 		WHEN A.KD_STATUS = '401' THEN 'Paid'
// 		ELSE 'Unpaid'
// 	END AS STATUS_LUNAS,
// 	TO_CHAR(VDL_BAST.TGL_DOKUMEN, 'DD-Mon-YYYY') AS TGL_BAST,
// 	TO_CHAR(A.CREATED_AT, 'DD-Mon-YYYY') AS TGL_CREATED,
// 	VDL_BAST.CREATED_BY AS CREATED_BAST,
// 	TRUNC(CAST(VDL_BAST.CREATED_AT AS DATE))
//            - TRUNC(CAST(A.CREATED_AT AS DATE)) AS SLA_BAST,
// 	TO_CHAR(VDL_INV.CREATED_AT, 'DD-Mon-YYYY') AS TGL_INV,
// 	VDL_INV.CREATED_BY AS CREATED_INV,
// 	TRUNC(CAST((SELECT DPS.DATE_STATUS FROM D_PROJECT_STATUS DPS WHERE DPS.KD_STATUS = '400' AND DPS.PROJECT_ID = A.BILLING_ID ORDER BY DPS.DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) AS DATE))
//            - TRUNC(CAST((SELECT DPS.DATE_STATUS FROM D_PROJECT_STATUS DPS WHERE DPS.KD_STATUS = '403' AND DPS.PROJECT_ID = A.BILLING_ID ORDER BY DPS.DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) AS DATE)) AS SLA_INV,
// 	TO_CHAR(VDL_FP.CREATED_AT, 'DD-Mon-YYYY') AS TGL_FP,
// 	VDL_FP.NO_DOKUMEN AS NO_FP,
//     TO_CHAR(TO_DATE(A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 'MM-YYYY'), 'Mon YYYY') AS PERIODE_PYMAD 
// FROM
// 	D_BILLING A
// LEFT JOIN D_BILLING_REVENUE B ON
// 	A.BILLING_ID = B.BILLING_ID
// JOIN D_BILLING_DOKUMEN DBD ON
// 	DBD.BILLING_ID = A.BILLING_ID
// JOIN D_DOKUMEN DD ON
// 	DD.DOKUMEN_ID = DBD.DOKUMEN_ID
// 	AND DD.JNS_DOKUMEN = '01004' AND DD.FLAG_DELETE = 'F'
// LEFT JOIN D_PROJECT C ON
// 	C.PROJECT_ID = A.PROJECT_ID
// LEFT JOIN M_CUSTOMER M1 ON
// 	M1.CUSTOMER_ID = COALESCE(B.CUSTOMER_ID_TO_SAP, C.CUSTOMER_ID)
// LEFT JOIN M_PORTOFOLIO P ON
// 	P.PORTOFOLIO_ID = C.PORTOFOLIO_ID
// 	--          LEFT JOIN BAST BT ON BT.BILLING_ID = A.BILLING_ID AND BT.RN = 1
// LEFT JOIN V_DOKUMEN_LATEST VDL_BAST
//                    ON
// 	VDL_BAST.BILLING_ID = A.BILLING_ID
// 	AND VDL_BAST.JNS_DOKUMEN = '04006'
// 	AND VDL_BAST.RN = 1
// LEFT JOIN V_DOKUMEN_LATEST VDL_INV
//                    ON
// 	VDL_INV.BILLING_ID = A.BILLING_ID
// 	AND VDL_INV.JNS_DOKUMEN = '01004'
// 	AND VDL_INV.RN = 1
// LEFT JOIN V_DOKUMEN_LATEST VDL_FP
//                    ON
// 	VDL_FP.BILLING_ID = A.BILLING_ID
// 	AND VDL_FP.JNS_DOKUMEN = '01003'
// 	AND VDL_FP.RN = 1
// WHERE
// 	--(SELECT TO_CHAR(DPS.DATE_STATUS, 'MM-YYYY') FROM D_PROJECT_STATUS DPS WHERE DPS.KD_STATUS = '400' AND DPS.PROJECT_ID = A.BILLING_ID ORDER BY DPS.DATE_STATUS ASC FETCH FIRST 1 ROWS ONLY) = :month
// 	TO_CHAR(DD.CREATED_AT, 'MM-YYYY') = :month
// 	AND A.KD_STATUS NOT IN ('302')
// 	AND A.KD_STATUS IS NOT NULL
// 	--(SELECT COUNT(DPS.STATUS_ID) FROM D_PROJECT_STATUS DPS WHERE DPS.KD_STATUS = '400' AND DPS.--PROJECT_ID = A.BILLING_ID) > 1
// 	--TO_CHAR(DD.CREATED_AT, 'MM-YYYY') = :month AND A.KD_STATUS NOT IN ('302') AND A.KD_STATUS IS --NOT NULL
// 	--(A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING) = :month AND A.KD_STATUS NOT IN ----('302') AND A.KD_STATUS IS NOT NULL
// ORDER BY
// 	M1.KODE_AKUN ASC;
// `
query.getListReportTransaksi = `
SELECT B.BILLING_ID,
       B.BILLING_CODE,
       E.CUSTOMER_NAME,
       A.NO_DOKUMEN,
       TO_CHAR(F.TGL_DOKUMEN, 'DD-MM-YYYY') AS TGL_INVOICE,
       TO_CHAR(F.CREATED_AT, 'DD-MM-YYYY') AS TGL_CREATE_INVOICE,
       B.DOC_NUMBER,
       D.PROJECT_NO,
       D.PROJECT_NAME,
       B.DESC_TERMIN,
       C.STATUS_PYMAD,
       TO_CHAR(C.TANGGAL_POSTING, 'DD-MM-YYYY') AS TGL_POSTING,
       B.REAL_BULAN_BILLING || B.REAL_PERIODE_BILLING,
       A.NILAI_PYMAD,
       A.DPP,
       A.NILAI_PYMAD - A.DPP,
       A.NILAI_PPN,
       A.NILAI_INVOICE,
       C.WAPU,
       A.NO_DOKUMEN NO_INVOICE,
       (SELECT SUM(PRICE * JENIS_PPH / 100)
        FROM R_TRANSACTION_DETAIL rtd
                 JOIN R_TRANSACTION rt ON
            rt.TRANSACTION_ID = rtd.TRANSACTION_ID
        WHERE rt.BILLING_ID = B.BILLING_ID
          AND rt.POSTING_RESPONSE = 'S')                                                  AS PPH,
       ''                                                                                    NILAI_BAYAR,
       A.REVENUE AS HARGA_JUAL,
       (A.REVENUE - B.REAL_BILLING) SELISIH,
       A.NILAI_PPN PPN,
       A.NILAI_INVOICE AS NILAI_TAGIHAN,
       TO_CHAR(TO_DATE(B.REAL_BULAN_BILLING || '-' || B.REAL_PERIODE_BILLING, 'MM-YYYY'), 'Mon YYYY') AS PERIODE_PYMAD,
       B.REAL_PERIODE_BILLING                                                                YEAR,
       CASE
           WHEN A.KD_STATUS = '401' THEN 'Paid'
           ELSE 'Unpaid'
           END                                                                            AS STATUS_LUNAS,
       TO_CHAR((SELECT MAX(dps.DATE_STATUS)
                FROM D_PROJECT_STATUS dps
                WHERE dps.KD_STATUS = '401'
                  AND dps.PROJECT_ID = B.BILLING_ID FETCH FIRST 1 ROWS ONLY),
               'DD-Mon-YYYY')                                                                TGL_PAID,
       TO_CHAR(VDL_BAST.TGL_DOKUMEN, 'DD-Mon-YYYY')                                       AS TGL_BAST,
       VDL_INV.CREATED_BY                                                                 AS CREATED_INV,
       TRUNC(CAST((SELECT DPS.DATE_STATUS
                   FROM D_PROJECT_STATUS DPS
                   WHERE DPS.KD_STATUS = '400'
                     AND DPS.PROJECT_ID = B.BILLING_ID
                   ORDER BY DPS.DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) AS DATE))
           - TRUNC(CAST((SELECT DPS.DATE_STATUS
                         FROM D_PROJECT_STATUS DPS
                         WHERE DPS.KD_STATUS = '403'
                           AND DPS.PROJECT_ID = B.BILLING_ID
                         ORDER BY DPS.DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) AS DATE)) AS SLA_INV,
       TO_CHAR(VDL_FP.CREATED_AT, 'DD-Mon-YYYY')                                          AS TGL_FP,
       VDL_FP.NO_DOKUMEN                                                                  AS NO_FP
FROM R_KEUANGAN A
         JOIN D_BILLING B ON B.BILLING_ID = A.SOURCE_ID
         JOIN D_BILLING_REVENUE C ON C.BILLING_ID = B.BILLING_ID
         JOIN D_PROJECT D ON D.PROJECT_ID = B.PROJECT_ID
         JOIN M_CUSTOMER E ON E.CUSTOMER_ID = COALESCE(C.CUSTOMER_ID_TO_SAP, D.CUSTOMER_ID)
         JOIN D_DOKUMEN F ON F.DOKUMEN_ID = A.DOKUMEN_ID
         LEFT JOIN V_DOKUMEN_LATEST VDL_BAST
                   ON
                       VDL_BAST.BILLING_ID = B.BILLING_ID
                           AND VDL_BAST.JNS_DOKUMEN = '04006'
                           AND VDL_BAST.RN = 1
         LEFT JOIN V_DOKUMEN_LATEST VDL_INV
                   ON
                       VDL_INV.BILLING_ID = B.BILLING_ID
                           AND VDL_INV.JNS_DOKUMEN = '01004'
                           AND VDL_INV.RN = 1
         LEFT JOIN V_DOKUMEN_LATEST VDL_FP
                   ON
                       VDL_FP.BILLING_ID = B.BILLING_ID
                           AND VDL_FP.JNS_DOKUMEN = '01003'
                           AND VDL_FP.RN = 1
WHERE A.EVENT_CODE = 'INVOICE'
  AND TO_CHAR(A.ACTIVE_DATE, 'MM-YYYY') = :month
  AND B.KD_STATUS NOT IN ('302')
  AND B.KD_STATUS IS NOT NULL
ORDER BY E.KODE_AKUN ASC;
`

// query.getListReportPiutangMutasiTambah = `
//     WITH LATEST_STATUS AS (SELECT PROJECT_ID, 
//                                   MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
//                                   MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
//                                   MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
//                                   MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
//                                   MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
//                                   MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
//                                   MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
//                                   MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
//                                   MAX(CASE
//                                           WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
//                                           ELSE CREATED_BY
//                                       END)                                                                      AS NAMA_DELIVERY 
//                            FROM D_PROJECT_STATUS
//                            WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406') 
//                            GROUP BY PROJECT_ID)
//     SELECT A.BILLING_ID,
//            A.BILLING_CODE,
//            A.PROJECT_ID,
//            B.PROJECT_NO,
//            B.PROJECT_NAME,
//            B.KD_SPUC,
//            A.DIVISI_ID,
//            C.CUSTOMER_NAME,
//            A.TERMIN,
//            A.KD_STATUS,
//            D.PORTOFOLIO,
//            E.NAMA_DELIVERY,
//            A.KETERANGAN,
//            A.DESC_TERMIN,
//            F.NO_INVOICE,
//            CASE 
//                 WHEN A.KD_STATUS = '303' THEN
//                 'Req. Faktur' 
//                 WHEN A.KD_STATUS = '302' THEN
//                 'Rejected' 
//                 WHEN A.KD_STATUS = '301' THEN
//                     'Sent' 
//                 WHEN A.KD_STATUS = '400' THEN
//                     'Invoice' 
//                 WHEN A.KD_STATUS = '401' THEN
//                     'Paid' 
//                 WHEN A.KD_STATUS = '402' THEN
//                     'PYMAD' 
//                 WHEN A.KD_STATUS = '403' THEN
//                     'Completed' 
//                 WHEN A.KD_STATUS = '406' THEN
//                     'Batal PYMAD' 
//                 ELSE '-' END                         
//             AS STATUS,
//             CASE 
//                 WHEN A.KD_STATUS IN ('400', '401', '403') THEN 
//                 1 
//                 ELSE 0 END 
//             AS FLAG_REJECT, 
//            --CASE
//             --WHEN F.STATUS_PYMAD = 'T' THEN F.NOMINAL_PYMAD 
//             --WHEN F.STATUS_INVOICE = 'T' THEN F.NOMINAL_INVOICE 
//                --ELSE a.REAL_BILLING END               AS NOMINAL,
//             a.REAL_BILLING AS NOMINAL,
//            CASE
//                WHEN F.STATUS_PELUNASAN = 'T' THEN to_char(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY')
//                WHEN F.STATUS_INVOICE = 'T' THEN to_char(F.TANGGAL_INVOICE, 'DD/MM/YYYY')
//                ELSE '-' END                          AS TANGGAL,
//            CONCAT(to_char(b.MARGIN_PRESENTASE), '%') AS "MARGIN_PRESENTASE",
//            G.URAIAN                                  AS "URAIAN_STATUS",
//            E.LATEST_DATE_STATUS,
//            TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
//            TO_CHAR(
//             LAST_DAY(TO_DATE('01-' || A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY')),
//             'DD-Mon-YYYY'
//             ) AS TANGGAL_ACRUE,
//            ABS(TRUNC(LAST_DAY(TO_DATE('01-' || :month, 'DD-MM-YYYY'))) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) AS UMUR_PYMAD,
//            E.SLA_KD_START                              AS "SLA0_START",
//            E.SLA_KD_END                              AS "SLA0_END",
//            E.SLA_SUBMIT_START                              AS "SLA1_START",
//            E.SLA_INVOICE_START                              AS "SLA1_END",
//            E.SLA_INVOICE_START                              AS "SLA2_START",
//            E.SLA_PAID                                AS "SLA2_END",
//            E.KETERANGAN_REJECT,
//            E.KETERANGAN_REQ_FAKTUR  
//     FROM N2N.D_BILLING A
//              LEFT JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ID
//              LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
//              LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
//              LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
//              LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = COALESCE(F.CUSTOMER_ID_TO_SAP, B.CUSTOMER_ID) 
//              LEFT JOIN N2N.M_STATUS G
//                        ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1') 
//     WHERE ((A.FLAG_PARENT = 1 AND A.PARENT_ID IS NULL AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.PARENT_ID = A.BILLING_ID) = 0) OR (A.FLAG_PARENT = 0 AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.BILLING_ID = A.PARENT_ID AND db.FLAG_PARENT = 2) = 0) OR A.FLAG_PARENT = 2) 
//     AND REGEXP_LIKE(TO_CHAR(A.REAL_BULAN_BILLING), '^(0?[1-9]|1[0-2])$')
//     AND REGEXP_LIKE(TO_CHAR(A.REAL_PERIODE_BILLING), '^[0-9]{4}$') 
//     AND (SELECT TO_CHAR(MAX(dpss.DATE_STATUS), 'MM-YYYY') FROM D_PROJECT_STATUS dpss WHERE dpss.PROJECT_ID = A.BILLING_ID AND dpss.KD_STATUS = '400') = :month 
//     ORDER BY A.REAL_PERIODE_BILLING ASC, A.REAL_BULAN_BILLING;`
query.getListReportPiutangMutasiTambah = `
WITH LATEST_STATUS AS (
SELECT
	PROJECT_ID,
	MAX(CASE
                                      WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406')
                                          THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
	MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_KD_START,
	MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_KD_END,
	MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_SUBMIT_START,
	MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_INVOICE_START,
	MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_PAID,
	MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
	MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
	MAX(CASE
                                      WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
                                      ELSE CREATED_BY
                                  END) AS NAMA_DELIVERY
FROM
	D_PROJECT_STATUS
WHERE
	KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406')
GROUP BY
	PROJECT_ID)
SELECT
	A.SOURCE_ID,
	B.BILLING_CODE,
	E.CUSTOMER_NAME,
	D.PROJECT_NO,
	D.PROJECT_NAME,
	B.TERMIN,
	B.DESC_TERMIN,
	A.NO_DOKUMEN AS NO_INVOICE,
	TO_CHAR(A.TGL_DOKUMEN, 'DD-MM-YYYY') AS TANGGAL_INVOICE,
	TO_CHAR(A.TGL_EVENT, 'DD-MM-YYYY') AS TANGGAL_CREATED_INVOICE,
	F.ACTIVE_DATE AS TANGGAL_TAGIHAN,
	A.DPP AS NOMINAL_DPP,
	A.NILAI_PPN AS NOMINAL_PPN,
	A.NILAI_INVOICE AS NOMINAL,
	A.PERIODE,
	A.ACTIVE_DATE,
	to_Char(A.INACTIVE_DATE, 'yyyymm'),
	F.REPORTING_ID,
	TO_CHAR(
               LAST_DAY(TO_DATE('01-' || B.REAL_BULAN_BILLING || '-' || B.REAL_PERIODE_BILLING, 'DD-MM-YYYY')), 'DD-Mon-YYYY'
       ) AS TANGGAL_ACRUE,
	ABS(TRUNC(LAST_DAY(TO_DATE('01-' || TO_CHAR(TO_DATE(:p_periode, 'YYYYMM'), 'MM-YYYY'), 'DD-MM-YYYY'))) -
           TRUNC(LAST_DAY(G.LATEST_DATE_STATUS))) AS UMUR_PYMAD,
	G.SLA_KD_START AS "SLA0_START",
	G.SLA_KD_END AS "SLA0_END",
	G.SLA_SUBMIT_START AS "SLA1_START",
	G.SLA_INVOICE_START AS "SLA1_END",
	G.SLA_INVOICE_START AS "SLA2_START",
	G.SLA_PAID AS "SLA2_END",
	G.KETERANGAN_REJECT,
	G.KETERANGAN_REQ_FAKTUR,
	B.DIVISI_ID
FROM
	R_KEUANGAN A
JOIN D_BILLING B ON
	B.BILLING_ID = A.SOURCE_ID
JOIN D_BILLING_REVENUE C ON
	C.BILLING_ID = A.SOURCE_ID
JOIN D_PROJECT D ON
	D.PROJECT_ID = A.PROJECT_ID
JOIN M_CUSTOMER E ON
	E.CUSTOMER_ID = COALESCE(C.CUSTOMER_ID_TO_SAP, D.CUSTOMER_ID)
LEFT JOIN R_KEUANGAN F
                   ON
	F.SUB_REPORTING_ID = A.REPORTING_ID
	AND F.EVENT_CODE = 'SURAT TAGIHAN'
	AND F.IS_CONDITION = 'A'
LEFT JOIN LATEST_STATUS G ON
	G.PROJECT_ID = B.BILLING_ID
WHERE
	A.EVENT_CODE = 'INVOICE'
	AND TO_CHAR(A.ACTIVE_DATE, 'YYYYMM') = :p_periode
	AND A.IS_CONDITION = 'A';
`

// query.getListReportPiutangMutasiKurang = `
//     WITH LATEST_STATUS AS (SELECT PROJECT_ID, 
//                                   MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
//                                   MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
//                                   MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
//                                   MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
//                                   MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
//                                   MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
//                                   MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
//                                   MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
//                                   MAX(CASE
//                                           WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
//                                           ELSE CREATED_BY
//                                       END)                                                                      AS NAMA_DELIVERY 
//                            FROM D_PROJECT_STATUS
//                            WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406') 
//                            GROUP BY PROJECT_ID)
//     SELECT A.BILLING_ID,
//            A.BILLING_CODE,
//            A.PROJECT_ID,
//            B.PROJECT_NO,
//            B.PROJECT_NAME,
//            B.KD_SPUC,
//            A.DIVISI_ID,
//            C.CUSTOMER_NAME,
//            A.TERMIN,
//            A.KD_STATUS,
//            D.PORTOFOLIO,
//            E.NAMA_DELIVERY,
//            A.KETERANGAN,
//            A.DESC_TERMIN,
//            F.NO_INVOICE,
//            CASE 
//                 WHEN A.KD_STATUS = '303' THEN
//                 'Req. Faktur' 
//                 WHEN A.KD_STATUS = '302' THEN
//                 'Rejected' 
//                 WHEN A.KD_STATUS = '301' THEN
//                     'Sent' 
//                 WHEN A.KD_STATUS = '400' THEN
//                     'Invoice' 
//                 WHEN A.KD_STATUS = '401' THEN
//                     'Paid' 
//                 WHEN A.KD_STATUS = '402' THEN
//                     'PYMAD' 
//                 WHEN A.KD_STATUS = '403' THEN
//                     'Completed' 
//                 ELSE '-' END                         
//             AS STATUS,
//             CASE 
//                 WHEN A.KD_STATUS IN ('400', '401', '403') THEN 
//                 1 
//                 ELSE 0 END 
//             AS FLAG_REJECT, 
//            --CASE
//             --WHEN F.STATUS_PYMAD = 'T' THEN F.NOMINAL_PYMAD 
//             --WHEN F.STATUS_INVOICE = 'T' THEN F.NOMINAL_INVOICE 
//                --ELSE a.REAL_BILLING END               AS NOMINAL,
//             a.REAL_BILLING AS NOMINAL,
//            CASE
//                WHEN F.STATUS_PELUNASAN = 'T' THEN to_char(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY')
//                WHEN F.STATUS_INVOICE = 'T' THEN to_char(F.TANGGAL_INVOICE, 'DD/MM/YYYY')
//                ELSE '-' END                          AS TANGGAL,
//            CONCAT(to_char(b.MARGIN_PRESENTASE), '%') AS "MARGIN_PRESENTASE",
//            G.URAIAN                                  AS "URAIAN_STATUS",
//            E.LATEST_DATE_STATUS,
//            TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
//            --TO_CHAR(SI.DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS_INVOICE,
//            TO_CHAR(
//             LAST_DAY(TO_DATE('01-' || A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY')),
//             'DD-Mon-YYYY'
//             ) AS TANGGAL_ACRUE,
//            ABS(TRUNC(LAST_DAY(TO_DATE('01-' || :month, 'DD-MM-YYYY'))) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) AS UMUR_PYMAD,
//            E.SLA_KD_START                              AS "SLA0_START",
//            E.SLA_KD_END                              AS "SLA0_END",
//            E.SLA_SUBMIT_START                              AS "SLA1_START",
//            E.SLA_INVOICE_START                              AS "SLA1_END",
//            E.SLA_INVOICE_START                              AS "SLA2_START",
//            E.SLA_PAID                                AS "SLA2_END",
//            E.KETERANGAN_REJECT,
//            E.KETERANGAN_REQ_FAKTUR  
//     FROM N2N.D_BILLING A
//              LEFT JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ID
//              LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
//              LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
//              LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID 
//              LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = COALESCE(F.CUSTOMER_ID_TO_SAP, B.CUSTOMER_ID)
//              --LEFT JOIN STATUS_INVOICE SI ON SI.PROJECT_ID = A.BILLING_ID 
//              LEFT JOIN N2N.M_STATUS G
//                        ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1') 
//     WHERE ((A.FLAG_PARENT = 1 AND A.PARENT_ID IS NULL AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.PARENT_ID = A.BILLING_ID) = 0) OR (A.FLAG_PARENT = 0 AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.BILLING_ID = A.PARENT_ID AND db.FLAG_PARENT = 2) = 0) OR A.FLAG_PARENT = 2) 
//     AND REGEXP_LIKE(TO_CHAR(A.REAL_BULAN_BILLING), '^(0?[1-9]|1[0-2])$')
//     AND REGEXP_LIKE(TO_CHAR(A.REAL_PERIODE_BILLING), '^[0-9]{4}$') 
//     AND A.KD_STATUS IN ('401') 
//     AND (((SELECT MAX(dpro.DATE_STATUS) FROM D_PROJECT_STATUS dpro WHERE dpro.PROJECT_ID = A.BILLING_ID AND dpro.KD_STATUS = '400') < TO_DATE('01-' || :month, 'DD-MM-YYYY'))
//     OR (TO_CHAR((SELECT MAX(dpro.DATE_STATUS) FROM D_PROJECT_STATUS dpro WHERE dpro.PROJECT_ID = A.BILLING_ID AND dpro.KD_STATUS = '400'), 'MM-YYYY') = :month))  
//     ORDER BY (SELECT MAX(dpro.DATE_STATUS) FROM D_PROJECT_STATUS dpro WHERE dpro.PROJECT_ID = A.BILLING_ID AND dpro.KD_STATUS = '400') ASC;`
query.getListReportPiutangMutasiKurang = `
WITH LATEST_STATUS AS (
SELECT
	PROJECT_ID,
	MAX(CASE
                                      WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406')
                                          THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
	MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_KD_START,
	MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_KD_END,
	MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_SUBMIT_START,
	MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_INVOICE_START,
	MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_PAID,
	MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
	MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
	MAX(CASE
                                      WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
                                      ELSE CREATED_BY
                                  END) AS NAMA_DELIVERY
FROM
	D_PROJECT_STATUS
WHERE
	KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406')
GROUP BY
	PROJECT_ID)
SELECT
	A.SOURCE_ID,
	B.BILLING_CODE,
	E.CUSTOMER_NAME,
	D.PROJECT_NO,
	D.PROJECT_NAME,
	B.TERMIN,
	B.DESC_TERMIN,
	A.NO_DOKUMEN AS NO_INVOICE,
	TO_CHAR(A.TGL_DOKUMEN, 'DD-MM-YYYY') AS TANGGAL_INVOICE,
	TO_CHAR(A.TGL_EVENT, 'DD-MM-YYYY') AS TANGGAL_CREATED_INVOICE,
	F.ACTIVE_DATE AS TANGGAL_TAGIHAN,
	A.DPP AS NOMINAL_DPP,
	A.NILAI_PPN AS NOMINAL_PPN,
	A.NILAI_INVOICE AS NOMINAL,
	A.PERIODE,
	A.ACTIVE_DATE,
	to_Char(A.INACTIVE_DATE, 'yyyymm'),
	F.REPORTING_ID,
	TO_CHAR(
               LAST_DAY(TO_DATE('01-' || B.REAL_BULAN_BILLING || '-' || B.REAL_PERIODE_BILLING, 'DD-MM-YYYY')),
               'DD-Mon-YYYY'
       ) AS TANGGAL_ACRUE,
	ABS(TRUNC(LAST_DAY(TO_DATE('01-' || TO_CHAR(TO_DATE(:p_periode, 'YYYYMM'), 'MM-YYYY'), 'DD-MM-YYYY'))) -
           TRUNC(LAST_DAY(G.LATEST_DATE_STATUS))) AS UMUR_PYMAD,
	G.SLA_KD_START AS "SLA0_START",
	G.SLA_KD_END AS "SLA0_END",
	G.SLA_SUBMIT_START AS "SLA1_START",
	G.SLA_INVOICE_START AS "SLA1_END",
	G.SLA_INVOICE_START AS "SLA2_START",
	G.SLA_PAID AS "SLA2_END",
	G.KETERANGAN_REJECT,
	G.KETERANGAN_REQ_FAKTUR,
    B.DIVISI_ID 
FROM
	R_KEUANGAN A
JOIN D_BILLING B ON
	B.BILLING_ID = A.SOURCE_ID
JOIN D_BILLING_REVENUE C ON
	C.BILLING_ID = A.SOURCE_ID
JOIN D_PROJECT D ON
	D.PROJECT_ID = A.PROJECT_ID
JOIN M_CUSTOMER E ON
	E.CUSTOMER_ID = COALESCE(C.CUSTOMER_ID_TO_SAP, D.CUSTOMER_ID)
LEFT JOIN R_KEUANGAN F
                   ON
	F.SUB_REPORTING_ID = A.REPORTING_ID
	AND F.EVENT_CODE = 'SURAT TAGIHAN'
	AND F.IS_CONDITION = 'A'
LEFT JOIN LATEST_STATUS G ON
	G.PROJECT_ID = B.BILLING_ID
WHERE
	A.EVENT_CODE = 'INVOICE'
	AND TO_CHAR(A.INACTIVE_DATE, 'YYYYMM') = :p_periode
	AND A.IS_CONDITION = 'A';
`

query.getDetailPortofolio = `
SELECT
    a.* 
FROM N2N.M_PORTOFOLIO a 
WHERE
    a.PORTOFOLIO_ID = :portofolio_id`

query.getDetailCustomer = `
SELECT
    a.* 
FROM N2N.M_CUSTOMER a 
WHERE
    a.CUSTOMER_ID = :customer_id`

query.getDetailVendorPt = `
SELECT
    a.* 
FROM N2N.M_VENDOR_PT a 
WHERE
    a.VENDOR_ID = :vendor_id`

query.getDetailContactCustomer = `
SELECT
    a.* 
FROM N2N.M_CUSTOMER_CONTACT a 
WHERE
    a.CUSTOMER_ID = :customer_id`

query.getDetailContactVendorPt = `
SELECT
    a.* 
FROM N2N.M_VENDOR_KONTAK a 
WHERE
    a.VENDOR_ID = :vendor_id`

query.getListCustomer = `
    SELECT 
        ROW_NUMBER() OVER (ORDER BY a.CREATED_AT :order) AS row_number,
        a.* 
    FROM N2N.M_CUSTOMER a 
    WHERE 
        a.FLAG_AKTIF IN ('Y','T')
        AND
        (upper(a.CUSTOMER_NAME) like upper(:keyword)
        OR upper(a.NPWP) like upper(:keyword)
        OR upper(a.ADDRESS) like upper(:keyword)
        OR upper(a.EMAIL) like upper(:keyword)
        OR upper(a.FAX) like upper(:keyword)
        OR upper(a.TELP) like upper(:keyword)
        OR upper(a.DESCRIPTION) like upper(:keyword)
        )
    ORDER BY a.CREATED_AT :order
    OFFSET (:page - 1) * :limit ROWS -- Calculate offset
    FETCH NEXT :limit ROWS ONLY;`

query.getListKaryawan = `
    SELECT 
        ROW_NUMBER() OVER (ORDER BY a.CREATED_AT :order) AS row_number,
        a.*,
        b.DEPARTMENT_CODE AS DIVISI_ID 
    FROM N2N.M_KARYAWAN a LEFT JOIN N2N.M_DEPARTMENT b ON b.DEPARTMENT_ID = a.DEPARTMENT_ID
    WHERE 
        a.AKTIF IN ('Y','T')
        AND
        (upper(a.NAMA) like upper(:keyword)
        OR upper(a.NIK) like upper(:keyword)
        OR upper(a.ALAMAT) like upper(:keyword)
        OR upper(a.EMAIL) like upper(:keyword)
        OR upper(a.TANGGAL_LAHIR) like upper(:keyword)
        OR upper(a.STATUS_KARYAWAN) like upper(:keyword)
        )
    ORDER BY a.CREATED_AT :order
    OFFSET (:page - 1) * :limit ROWS -- Calculate offset
    FETCH NEXT :limit ROWS ONLY;`

query.getListPortofolio = `
    SELECT
        a.* 
    FROM N2N.M_PORTOFOLIO a 
    WHERE 
        (upper(a.TAHUN) like upper(:keyword)
        OR upper(a.KODE) like upper(:keyword)
        OR upper(a.KODE_AKUN) like upper(:keyword)
        OR upper(a.PORTOFOLIO) like upper(:keyword) 
        OR upper(a.KETERANGAN) like upper(:keyword)
        )
    ORDER BY a.CREATED_AT :order
    OFFSET (:page - 1) * :limit ROWS -- Calculate offset
    FETCH NEXT :limit ROWS ONLY;`

query.getListReferensi = `
    SELECT
        ROW_NUMBER() OVER (ORDER BY a.CREATED_DATE :order) AS row_number,
        a.* 
    FROM N2N.M_REFERENSI a 
    WHERE 
        a.FLAG_AKTIF IN ('Y','T')
        AND
        (upper(a.KD_REF) like upper(:keyword)
        OR upper(a.UR_REF) like upper(:keyword)
        OR upper(a.JNS_REF) like upper(:keyword)
        )
    ORDER BY a.CREATED_DATE :order
    OFFSET (:page - 1) * :limit ROWS -- Calculate offset
    FETCH NEXT :limit ROWS ONLY;`

query.getDetailReferensi = `
    SELECT
        a.* 
    FROM N2N.M_REFERENSI a 
    WHERE
        a.KD_REF = :kd_ref
        AND a.UR_REF = :ur_ref
        AND a.JNS_REF = :jns_ref
        AND a.FLAG_AKTIF = :status`

query.countListCustomer = `
    SELECT
       count(a.CUSTOMER_ID) AS "total_data",
       :page AS "total_halaman",
       :limit AS "limit"
    FROM n2n.M_CUSTOMER a 
    WHERE 
        a.FLAG_AKTIF IN ('Y','T')
        AND
        (upper(a.CUSTOMER_NAME) like upper(:keyword)
        OR upper(a.NPWP) like upper(:keyword)
        OR upper(a.ADDRESS) like upper(:keyword)
        OR upper(a.EMAIL) like upper(:keyword)
        OR upper(a.FAX) like upper(:keyword)
        OR upper(a.TELP) like upper(:keyword)
        OR upper(a.DESCRIPTION) like upper(:keyword)
        );`

query.countListKaryawan = `
    SELECT
       count(a.KARYAWAN_ID) AS "total_data",
       :page AS "total_halaman",
       :limit AS "limit"
    FROM n2n.M_KARYAWAN a`

query.countListPortofolio = `
    SELECT
       count(a.PORTOFOLIO_ID) AS "total_data",
       :page AS "total_halaman",
       :limit AS "limit"
    FROM n2n.M_PORTOFOLIO a`

query.countListReferensi = `
    SELECT
       count(a.KD_REF) AS "total_data",
       :page AS "total_halaman",
       :limit AS "limit"
    FROM n2n.M_REFERENSI a`

query.projectNo = `SELECT N2N.GETPROJECTNO(':portofolio_id', ':customer_id') AS PROJECT_NO FROM DUAL;`

query.projectNoNew = `SELECT (SELECT CODE_NO FROM M_PORTOFOLIO WHERE PORTOFOLIO_ID = :PORTOFOLIO) || A.KODE_AKUN || :PROJECT_TYPE || '00' || :PROJECT_MODEL || COALESCE(B.N_CUST, '001') AS PROJECT_NO
FROM N2N.M_CUSTOMER A
         LEFT JOIN (SELECT X.CUSTOMER_ID,
                           LPAD(C_CUST + 1, 3, '0') AS N_CUST
                    FROM (SELECT CUSTOMER_ID,
                                 COUNT(CUSTOMER_ID) AS C_CUST
                          FROM D_PROJECT A
                          WHERE LENGTH(A.PROJECT_NO) = 11
                          GROUP BY CUSTOMER_ID) X) B ON B.CUSTOMER_ID = A.CUSTOMER_ID
WHERE A.CUSTOMER_ID = :CUSTOMER_ID`;

query.getStartDate = `SELECT TO_CHAR(MIN(:column), 'YYYY-MM-DD') AS "START_DATE" FROM :table;`

// query.getLogActivity = `SELECT b.*, TO_CHAR(b.DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') STATUS_DATE, c.URAIAN AS URAIAN_STATUS FROM n2n.D_PROJECT_STATUS b INNER JOIN n2n.M_STATUS c ON b.KD_STATUS = c.KD_STATUS WHERE b.PROJECT_ID = :project_id ORDER BY b.DATE_STATUS ASC;`
query.getLogActivity = `SELECT
    a.KD_STATUS,
    UPPER(b.URAIAN) AS STATUS ,
    a.NOTES,
    to_char(a.DATE_STATUS,'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS
FROM D_PROJECT_STATUS a
JOIN M_STATUS b on b.KD_STATUS = a.KD_STATUS
WHERE a.PROJECT_ID in
    ((SELECT
        a.PROJECT_ID
    FROM D_PROJECT a
    LEFT JOIN D_BILLING b on b.PROJECT_ID = a.PROJECT_ID
    LEFT JOIN D_BILLING_REVENUE c on c.BILLING_ID = b.BILLING_ID
    WHERE
        a.PROJECT_NO = :project_id
    GROUP BY a.PROJECT_ID)
    UNION ALL
    (SELECT
        b.BILLING_ID
    FROM D_PROJECT a
    LEFT JOIN D_BILLING b on b.PROJECT_ID = a.PROJECT_ID
    LEFT JOIN D_BILLING_REVENUE c on c.BILLING_ID = b.BILLING_ID
    WHERE
        a.PROJECT_NO = :project_id
    GROUP BY b.BILLING_ID)
    UNION ALL
    (SELECT
        c.BILLING_REVENUE_ID
    FROM D_PROJECT a
    LEFT JOIN D_BILLING b on b.PROJECT_ID = a.PROJECT_ID
    LEFT JOIN D_BILLING_REVENUE c on c.BILLING_ID = b.BILLING_ID
    WHERE
        a.PROJECT_NO = :project_id
    GROUP BY c.BILLING_REVENUE_ID))
order by a.DATE_STATUS DESC;`

query.getLogBillingActivity = `SELECT z.* FROM (
SELECT
    a.KD_STATUS,
    a.CREATED_BY,
    a.UPDATED_BY,
    UPPER(b.URAIAN) AS STATUS,
    a.NOTES,
    a.DATE_STATUS,
    to_char(a.DATE_STATUS,'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
    a.FLAG_NEW_DOK,
    CASE 
        WHEN c.URL_DOKUMEN IS NULL THEN '' 
        ELSE CONCAT('${LINK_DOK}', c.URL_DOKUMEN) 
    END AS URL_DOKUMEN,
    to_char(a.UPDATED_AT,'DD/MM/YYYY HH24:MI:SS') UPDATED_AT,
    a.TYPE_STATUS,
    a.ID_TAB_STATUS 
FROM D_PROJECT_STATUS a
JOIN M_STATUS b on b.KD_STATUS = a.KD_STATUS 
LEFT JOIN D_DOKUMEN c ON c.PROJECT_ID = a.STATUS_ID 
WHERE a.PROJECT_ID = :billing_id
UNION  
SELECT
    '' KD_STATUS,
    a.CREATED_BY,
    '' UPDATED_BY,
    'REQUEST FAKTUR' AS STATUS,
    '' NOTES,
    a.CREATED_DATE AS DATE_STATUS,
    to_char(a.CREATED_DATE,'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
    '' FLAG_NEW_DOK,
    '' AS URL_DOKUMEN,
    to_char(a.CREATED_DATE,'DD/MM/YYYY HH24:MI:SS') UPDATED_AT,
    'BL01' TYPE_STATUS,
    'FN1' ID_TAB_STATUS 
FROM NOTIFICATION_EVENT a 
WHERE a.PROJECT_ID = :billing_id AND a.NAVIGATE_TO = '/faktur-pajak' 
UNION 
SELECT
    '' KD_STATUS,
    a.CREATED_BY,
    a.UPDATED_BY,
    'UPLOAD FAKTUR' AS STATUS,
    CASE WHEN b.JNS_DOKUMEN = '01003' 
        THEN 'Faktur Pajak'
        ELSE 'Faktur Pajak Pengganti' 
    END AS NOTES,
    a.CREATED_AT AS DATE_STATUS,
    to_char(a.CREATED_AT,'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
    '' FLAG_NEW_DOK,
    b.URL_DOKUMEN,
    to_char(a.UPDATED_AT,'DD/MM/YYYY HH24:MI:SS') UPDATED_AT,
    'BL01' TYPE_STATUS,
    'FN1' ID_TAB_STATUS 
FROM D_BILLING_DOKUMEN a INNER JOIN D_DOKUMEN b ON b.DOKUMEN_ID = a.DOKUMEN_ID 
WHERE a.BILLING_ID = :billing_id AND b.JNS_DOKUMEN IN ('01003', '01032') 
) z order by z.DATE_STATUS DESC;`

query.getLogBillingSuratTagihan = `
SELECT
    b.CREATED_BY,
    to_char(b.CREATED_AT,'DD/MM/YYYY HH24:MI:SS') AS CREATED_AT,
    b.UPDATED_BY,
    to_char(b.UPDATED_AT,'DD/MM/YYYY HH24:MI:SS') UPDATED_AT,
    UPPER(c.STATUS) AS STATUS_PEO,
    c.CATATAN AS CATATAN_PEO,
    (c.NIP_AKSI || ' - ' || c.NAMA_AKSI) AS AKTOR_PEO,
    to_char(c.WAKTU_AKSI, 'DD/MM/YYYY HH24:MI:SS') WAKTU_PEO
FROM D_BILLING_DOKUMEN a
    JOIN D_DOKUMEN b on b.DOKUMEN_ID = a.DOKUMEN_ID
    JOIN D_SURAT_TAGIHAN_STATUS c ON c.NO_REF = b.NO_REF
WHERE a.BILLING_ID = :billing_id
    order by b.CREATED_AT DESC;`

query.getLogProject = `SELECT
    a.KD_STATUS,
    UPPER(b.URAIAN) AS UR_STATUS,
    a.NOTES,
    to_char(a.DATE_STATUS,'YYYY-MM-DD HH:mm:SS') AS TANGGAL_STATUS,
    CASE WHEN a.CREATED_BY IS NOT NULL THEN a.CREATED_BY ELSE a.UPDATED_BY END AS CREATED_BY 
FROM D_PROJECT_STATUS a
JOIN M_STATUS b on b.KD_STATUS = a.KD_STATUS
WHERE a.PROJECT_ID in
    ((SELECT
        a.PROJECT_ID
    FROM D_PROJECT a
    LEFT JOIN D_BILLING b on b.PROJECT_ID = a.PROJECT_ID
    LEFT JOIN D_BILLING_REVENUE c on c.BILLING_ID = b.BILLING_ID
    WHERE
        a.PROJECT_ID = :project_id
    GROUP BY a.PROJECT_ID)
    UNION ALL
    (SELECT
        b.BILLING_ID
    FROM D_PROJECT a
    LEFT JOIN D_BILLING b on b.PROJECT_ID = a.PROJECT_ID
    LEFT JOIN D_BILLING_REVENUE c on c.BILLING_ID = b.BILLING_ID
    WHERE
        a.PROJECT_ID = :project_id
    GROUP BY b.BILLING_ID)
    UNION ALL
    (SELECT
        c.BILLING_REVENUE_ID
    FROM D_PROJECT a
    LEFT JOIN D_BILLING b on b.PROJECT_ID = a.PROJECT_ID
    LEFT JOIN D_BILLING_REVENUE c on c.BILLING_ID = b.BILLING_ID
    WHERE
        a.PROJECT_ID = :project_id
    GROUP BY c.BILLING_REVENUE_ID))
order by a.DATE_STATUS DESC;`

query.getRemind = `SELECT
	b.*,
    c.NO_KONTRAK,
    c.JUDUL_KONTRAK,
    TO_CHAR(c.END_DATE, 'DD/MM/YYYY') AS END_DATE,
	(CASE
		WHEN CEIL(TO_DATE(TO_CHAR((SELECT END_DATE FROM n2n.D_PROJECT_VENDOR c WHERE c.PROJECT_VENDOR_ID = b.PROJECT_ID), 'YYYY-MM-DD'), 'YYYY-MM-DD')-SYSDATE) = b.DAY THEN '1'
		ELSE '0'
	END) AS FLAG_KIRIM
FROM
	(
	SELECT
		a.*,
		(CASE
			WHEN LIMIT_UNIT = 'month' THEN LIMIT_TIME * 30
			WHEN LIMIT_UNIT = 'year' THEN LIMIT_TIME * 365
			ELSE LIMIT_TIME
		END) AS DAY
	FROM
		n2n.D_REMIND a
	WHERE
		a.FLAG_SEND = 'F') b LEFT JOIN n2n.D_PROJECT_VENDOR c ON c.PROJECT_VENDOR_ID = b.PROJECT_ID;`

query.getLinkedPID = `SELECT 
    PROJECT_ID AS VALUE,
    PROJECT_NO || ' | ' ||PROJECT_NAME  AS LABEL
    FROM D_PROJECT
        WHERE 
    FLAG_AKTIF = 'T' AND 
        (LOWER(PROJECT_NO) LIKE '%' || :keyword || '%' 
        OR LOWER(PROJECT_NAME) LIKE '%' || :keyword || '%');`;

query.getLogProject = `
        SELECT
            a.KD_STATUS,
            UPPER(b.URAIAN) AS UR_STATUS,
            a.NOTES,
            to_char(a.DATE_STATUS, 'DD/MM/YYYY HH:mm:SS') AS TANGGAL_STATUS,
            CASE
                WHEN a.CREATED_BY IS NOT NULL THEN a.CREATED_BY
                ELSE a.UPDATED_BY
            END AS CREATED_BY
        FROM
            D_PROJECT_STATUS a
        JOIN M_STATUS b ON
            b.KD_STATUS = a.KD_STATUS
        WHERE
            a.PROJECT_ID IN
            ((
            SELECT
                a.PROJECT_ID
            FROM
                D_PROJECT a
            LEFT JOIN D_BILLING b ON
                b.PROJECT_ID = a.PROJECT_ID
            LEFT JOIN D_BILLING_REVENUE c ON
                c.BILLING_ID = b.BILLING_ID
            WHERE
                a.PROJECT_ID = ':project_id'
            GROUP BY
                a.PROJECT_ID)
        UNION ALL
            (
        SELECT
            b.BILLING_ID
        FROM
            D_PROJECT a
        LEFT JOIN D_BILLING b ON
            b.PROJECT_ID = a.PROJECT_ID
        LEFT JOIN D_BILLING_REVENUE c ON
            c.BILLING_ID = b.BILLING_ID
        WHERE
            a.PROJECT_ID = ':project_id'
        GROUP BY
            b.BILLING_ID)
        UNION ALL
            (
        SELECT
                c.BILLING_REVENUE_ID
        FROM
        D_PROJECT a
        LEFT JOIN D_BILLING b ON
        b.PROJECT_ID = a.PROJECT_ID
        LEFT JOIN D_BILLING_REVENUE c ON
        c.BILLING_ID = b.BILLING_ID
        WHERE
                a.PROJECT_ID = ':project_id'
        GROUP BY
        c.BILLING_REVENUE_ID))
            AND (UPPER(b.URAIAN) LIKE UPPER('%:keyword%')
                OR UPPER(a.NOTES) LIKE UPPER('%:keyword%')
                    OR UPPER(a.CREATED_BY) LIKE UPPER('%:keyword%')
                        OR UPPER(a.UPDATED_BY) LIKE UPPER('%:keyword%'))
        ORDER BY
            a.DATE_STATUS DESC;
        `;

query.getDetailProjectProfile = `SELECT
        a.*,
        0 as GROSS_MARGIN_PENAWARAN,
        0 as GROSS_MARGIN_KONTRAK,
        0 as NILAI_GROSS_MARGIN_PENAWARAN,
        0 as NILAI_GROSS_MARGIN_KONTRAK,
        b.UR_REF as "PROJECT_KATEGORI_UR",
        c.UR_REF as "PROJECT_TYPE_UR",
        d.PORTOFOLIO as "PORTOFOLIO_UR",
        e.UR_REF as "CATEGORY_UR",
        f.CUSTOMER_NAME,
        g.UR_REF as "UR_AREA",
        h.URAIAN as "UR_STATUS",
        i.UR_REF as "UR_SPUC",
        j.UR_REF as "TYPE_VALIDASI_UR",
        COALESCE(a.NILAI_KONTRAK, 0) AS NOMINAL_KONTRAK,
        COALESCE(a.NILAI_PENAWARAN, 0) AS NOMINAL_PENAWARAN,
        (SELECT
             COUNT(x3.PROJECT_ID)
         FROM D_PROJECT x3
         WHERE x3.PROJECT_TYPE_ID = '2'
         AND x3.PROJECT_ACTUAL_ID = a.PROJECT_ID) AS "TOTAL_AKSELERASI",
        (SELECT TO_NUMBER(
             CASE
                 WHEN
                         a.PROJECT_TYPE_ID = '1'
                     AND (SELECT COUNT(x1.PROJECT_ID) FROM N2N.D_DOKUMEN x1 WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.TIPE_DOKUMEN = '01') >= 1
                     AND a.KD_STATUS in ('002','003')
                     AND a.KD_ARCHIVE IS NULL
                     AND (SELECT COUNT(x2.PROJECT_ID) FROM N2N.D_PROJECT x2 WHERE x2.PROJECT_ACTUAL_ID = a.PROJECT_ID AND x2.PROJECT_TYPE_ID = '2') = 0
                         THEN '1' --TO ACCELERATION
                 ELSE '0'
             END) "TOTAL"
         FROM DUAL) AS "TO_AKSELERASI",
         (SELECT TO_NUMBER(
             CASE
                 WHEN a.PROJECT_TYPE_ID = '1' AND a.KD_ARCHIVE IS NULL THEN '1' --TO ACCELERATION
                 WHEN a.PROJECT_TYPE_ID = '2'
                      AND (SELECT COUNT(x1.PROJECT_ID) FROM N2N.D_DOKUMEN x1 WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.TIPE_DOKUMEN = '01') >= 1
                      AND a.KD_STATUS in ('002')
                      AND a.KD_ARCHIVE IS NULL
                     THEN '1' --MARK AS
                 ELSE '0'
             END) "TOTAL"
         FROM DUAL) AS "TO_MARK",
         CASE 
             WHEN	
                 (SELECT
                     1
                 FROM N2N.D_PROJECT_STATUS x1
                 WHERE x1.PROJECT_ID = a.PROJECT_ID AND x1.ID_TAB_STATUS = 'HK1' AND x1.KD_STATUS = '200') IS NOT NULL
                 THEN 0
             ELSE 1
         END FLAG_VENDOR,
         y.DETAIL_VENDOR as VENDOR_PLANNING,
         z.DETAIL_VENDOR as VENDOR_FINAL,
         a.DOKUMEN_BAMK_ID,
         (SELECT LISTAGG(cbb.DIVISI_ID, ', ') WITHIN GROUP (ORDER BY cbb.DIVISI_ID) FROM n2n.D_PROJECT_CBB cbb WHERE cbb.PROJECT_ID = a.PROJECT_ID) AS CBB,
         (SELECT COUNT(*) FROM n2n.D_BILLING bill WHERE bill.PROJECT_ID = a.PROJECT_ID) AS TOTAL_TERMIN, 
         (SELECT ms.URAIAN FROM n2n.D_BILLING bill LEFT JOIN n2n.M_STATUS ms ON bill.KD_STATUS = ms.KD_STATUS WHERE bill.PROJECT_ID = a.PROJECT_ID ORDER BY bill.TERMIN DESC FETCH FIRST 1 ROWS ONLY) AS STATUS_TERMIN, 
         (SELECT TERMIN FROM n2n.D_BILLING bill WHERE bill.PROJECT_ID = a.PROJECT_ID ORDER BY bill.TERMIN DESC FETCH FIRST 1 ROWS ONLY) AS CURRENT_TERMIN,
         (SELECT COALESCE(SUM(rev.NOMINAL_PELUNASAN), 0) FROM n2n.D_BILLING_REVENUE rev INNER JOIN n2n.D_BILLING bill ON bill.BILLING_ID = rev.BILLING_ID WHERE bill.PROJECT_ID = a.PROJECT_ID) AS NOMINAL_PELUNASAN  
     FROM n2n.D_PROJECT a
     LEFT JOIN n2n.M_REFERENSI b ON b.KD_REF = a.PROJECT_KATEGORI_ID AND b.JNS_REF = lower('PROJECT_KATEGORI_ID')
     LEFT JOIN n2n.M_REFERENSI c ON c.KD_REF = a.PROJECT_TYPE_ID AND c.JNS_REF = lower('PROJECT_TYPE_ID')
     LEFT JOIN n2n.M_PORTOFOLIO d ON d.PORTOFOLIO_ID = a.PORTOFOLIO_ID
     LEFT JOIN n2n.M_REFERENSI e ON e.KD_REF = a.CATEGORY_ID AND e.JNS_REF = lower('CATEGORY_ID')
     LEFT JOIN n2n.M_CUSTOMER f ON f.CUSTOMER_ID = a.CUSTOMER_ID AND f.FLAG_AKTIF = 'Y'
     LEFT JOIN n2n.M_REFERENSI g ON g.KD_REF = a.KD_AREA AND g.JNS_REF = lower('KD_AREA')
     LEFT JOIN n2n.M_STATUS h ON h.KD_STATUS = a.KD_STATUS AND h.ID_TAB_STATUS = 'SA1' 
     LEFT JOIN n2n.M_REFERENSI i ON i.KD_REF = a.KD_SPUC AND i.JNS_REF = lower('KD_SPUC')
     LEFT JOIN n2n.M_REFERENSI j ON j.KD_REF = a.TYPE_VALIDASI_ID AND j.JNS_REF = lower('TYPE_VALIDASI')
     LEFT JOIN (
         SELECT
             a.PROJECT_ID,
             SUM(a.NILAI_KONTRAK) AS NILAI_KONTRAK,
             JSON_ARRAYAGG(
                 JSON_OBJECT('PROJECT_VENDOR_ID' VALUE a.PROJECT_VENDOR_ID,
                             'PROJECT_ID' VALUE a.PROJECT_ID,
                             'VENDOR_ID' VALUE a.VENDOR_ID,
                             'NAMA_VENDOR' VALUE b.NAMA_PERUSAHAAN,
                             'NILAI_KONTRAK' VALUE a.NILAI_KONTRAK,
                             'NO_KONTRAK' VALUE a.NO_KONTRAK,
                             'JUDUL_KONTRAK' VALUE a.JUDUL_KONTRAK,
                             'HARGA_NEGOSIASI' VALUE a.NILAI_KONTRAK)) DETAIL_VENDOR
         FROM N2N.D_PROJECT_VENDOR a
         LEFT JOIN N2N.M_VENDOR_PT b ON b.VENDOR_ID = a.VENDOR_ID
         WHERE
             a.FLAG_FINAL = 'T'
         GROUP BY a.PROJECT_ID) y ON y.PROJECT_ID = a.PROJECT_ID
     LEFT JOIN (
         SELECT
             a.PROJECT_ID,
             SUM(a.NILAI_KONTRAK) AS NILAI_KONTRAK,
             JSON_ARRAYAGG(
                 JSON_OBJECT('PROJECT_VENDOR_ID' VALUE a.PROJECT_VENDOR_ID,
                             'PROJECT_ID' VALUE a.PROJECT_ID,
                             'VENDOR_ID' VALUE a.VENDOR_ID,
                             'NAMA_VENDOR' VALUE b.NAMA_PERUSAHAAN,
                             'NILAI_KONTRAK' VALUE a.NILAI_KONTRAK,
                             'NO_KONTRAK' VALUE a.NO_KONTRAK,
                             'JUDUL_KONTRAK' VALUE a.JUDUL_KONTRAK,
                             'START_DATE' VALUE TO_CHAR(a.START_DATE, 'YYYY-MM-DD'),
                             'END_DATE' VALUE TO_CHAR(a.END_DATE, 'YYYY-MM-DD'),
                             'HARGA_NEGOSIASI' VALUE a.NILAI_KONTRAK)) DETAIL_VENDOR
         FROM N2N.D_PROJECT_VENDOR a
         LEFT JOIN N2N.M_VENDOR_PT b ON b.VENDOR_ID = a.VENDOR_ID
         WHERE
             a.FLAG_FINAL = 'Y'
         GROUP BY a.PROJECT_ID) z ON z.PROJECT_ID = a.PROJECT_ID 
     where
         a.PROJECT_ID = :project_id;`

query.getPersonil = `
    SELECT 
        dp.project_id,
        dp.position_id,
        mr.ur_ref AS position_name,
        dpd.nama_personil
    FROM 
        d_personil dp
    LEFT JOIN 
        m_referensi mr ON dp.position_id = mr.kd_ref AND mr.JNS_REF = 'position_id'
    LEFT JOIN 
        d_personil_detail dpd ON dp.personel_id = dpd.personel_id
    WHERE 
        dp.project_id = :project_id;
`

query.getPercentage = `
SELECT
	70 AS RPM,
	10 AS RPM_RATIO,
	'UP' AS RPM_JENIS_RATIO,
	20 AS CPD,
	5 AS CPD_RATIO,
	'DOWN' AS CPD_JENIS_RATIO,
	a.MARGIN_PRESENTASE AS MARGIN,
	7 AS MARGIN_RATIO,
	'UP' AS MARGIN_JENIS_RATIO
FROM
	n2n.D_PROJECT a
WHERE
	a.PROJECT_ID = :project_id
`;

query.getCost = `
SELECT
	10 AS REVENUE_PROFIT_MARGIN,
	20 AS COST_PERCENTAGE_DISTRIBUTION,
	a.MARGIN_PRESENTASE AS MARGIN
FROM
	n2n.D_COST_OPR a
WHERE
	a.PROJECT_ID = :project_id
`;

query.getPercentageTop = `
SELECT
	10 AS TPV,
	10 AS TPV_RATIO,
	'UP' AS TPV_JENIS_RATIO,
	20 AS CTDC,
	10 AS CTDC_RATIO,
	'DOWN' AS CTDC_JENIS_RATIO
FROM
	n2n.D_PROJECT a
WHERE
	a.PROJECT_ID = :project_id
`;

query.getPercentageVendor = `
SELECT
	10 AS VPPV,
	10 AS VPPV_RATIO,
	'UP' AS VPPV_JENIS_RATIO 
FROM
	n2n.D_PROJECT a
WHERE
	a.PROJECT_ID = :project_id
`;

query.getListTop = `
SELECT
	a.TERMIN,
    a.BILLING_ID,
    a.DESC_TERMIN,
    a.DIVISI_ID,
    (TO_CHAR(TO_DATE(a.EST_BULAN_BILLING, 'MM'), 'Mon') || ' ' || a.EST_PERIODE_BILLING) AS EST_PERIODE,
    a.EST_BILLING, 
    (TO_CHAR(TO_DATE(a.REAL_BULAN_BILLING, 'MM'), 'Mon') || ' ' || a.REAL_PERIODE_BILLING) AS REAL_PERIODE,
    a.REAL_BILLING,
    a.KD_STATUS,
    b.URAIAN AS UR_STATUS,
    TO_CHAR(a.CREATED_AT, 'DD/MM/YYYY') AS TANGGAL 
FROM
	n2n.D_BILLING a
LEFT JOIN n2n.M_STATUS b ON
	a.KD_STATUS = b.KD_STATUS 
WHERE
	a.PROJECT_ID = :project_id 
ORDER BY a.TERMIN ASC
`;

query.getListBillingProject = `SELECT
	z.* 
FROM 
	(SELECT 
	a.BILLING_ID,
	a.TERMIN,
    a.DESC_TERMIN,
    a.DIVISI_ID,
    (TO_CHAR(TO_DATE(a.EST_BULAN_BILLING, 'MM'), 'Mon') || ' ' || a.EST_PERIODE_BILLING) AS EST_PERIODE,
    a.EST_BILLING, 
    (TO_CHAR(TO_DATE(a.REAL_BULAN_BILLING, 'MM'), 'Mon') || ' ' || a.REAL_PERIODE_BILLING) AS REAL_PERIODE,
    a.REAL_BILLING,
    a.KD_STATUS,
    b.URAIAN AS UR_STATUS,
    a.CREATED_AT, 
    TO_CHAR(a.CREATED_AT, 'DD/MM/YYYY') AS TANGGAL 
FROM
	n2n.D_BILLING a
LEFT JOIN n2n.M_STATUS b ON
	a.KD_STATUS = b.KD_STATUS 
WHERE
	a.PROJECT_ID = ':project_id') z  
    :condition 
    :order OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`

query.countListBillingProject = `SELECT
   count(z.BILLING_ID) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit"
FROM (SELECT 
	a.BILLING_ID,
	a.TERMIN,
    a.DESC_TERMIN,
    a.DIVISI_ID,
    (TO_CHAR(TO_DATE(a.EST_BULAN_BILLING, 'MM'), 'Mon') || ' ' || a.EST_PERIODE_BILLING) AS EST_PERIODE,
    a.EST_BILLING, 
    (TO_CHAR(TO_DATE(a.REAL_BULAN_BILLING, 'MM'), 'Mon') || ' ' || a.REAL_PERIODE_BILLING) AS REAL_PERIODE,
    a.REAL_BILLING,
    a.KD_STATUS,
    b.URAIAN AS UR_STATUS,
    TO_CHAR(a.CREATED_AT, 'DD/MM/YYYY') AS TANGGAL 
FROM
	n2n.D_BILLING a
LEFT JOIN n2n.M_STATUS b ON
	a.KD_STATUS = b.KD_STATUS 
WHERE
	a.PROJECT_ID = ':project_id') z :condition`;

query.getStatusProject = `SELECT 
	a.* 
FROM 	
	N2N.D_PROJECT_STATUS a  
WHERE 
	a.PROJECT_ID = :project_id AND a.KD_STATUS = :kd_status ORDER BY DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY;`

query.getListUserActivity = `SELECT 
    ROW_NUMBER() OVER (:order) AS row_number, 
    a.ACTIVITY_ID,
    TO_CHAR(a.TANGGAL, 'DD/MM/YYYY') TANGGAL,
    a.NIP,
    a.NAMA,
    TO_CHAR(a.LOGIN, 'DD/MM/YYYY HH24:MI:SS') LOGIN,
    TO_CHAR(a.LOGOUT, 'DD/MM/YYYY HH24:MI:SS') LOGOUT,
    a.FLAG_AKTIF 
FROM N2N.D_USER_ACTIVITY a WHERE (UPPER(a.NIP) like upper(:keyword) OR UPPER(a.NAMA) LIKE upper(:keyword)) :order OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`;

query.countListUserActivity = `SELECT count(a.ACTIVITY_ID) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit" FROM N2N.D_USER_ACTIVITY a WHERE (UPPER(a.NIP) like upper(:keyword) OR UPPER(a.NAMA) LIKE upper(:keyword))`;

query.getListApproval = `SELECT A.*, B.DEPARTMENT_NAME FROM M_PEGAWAI A LEFT JOIN M_DEPARTMENT B ON B.DEPARTMENT_ID = A.DEPARTMENT_ID WHERE (UPPER(A.NAMA) like upper(:keyword) OR UPPER(A.PEGAWAI_ID) like upper(:keyword)) ORDER BY A.NAMA ASC`;

query.getNotificationFaktur = `
SELECT ne.* -- CREATED_DATE , CREATED_BY
FROM NOTIFICATION_EVENT ne 
WHERE PROJECT_ID = :project_id AND NAVIGATE_TO = '/faktur-pajak' 
ORDER BY CREATED_DATE DESC;
`;

query.getListTask = `SELECT DISTINCT a.* FROM D_TASK a INNER JOIN D_TASK_ASSIGN b ON a.TASK_ID = b.TASK_ID WHERE (b.ASSIGN_TO = ':nip' OR a.ASSIGN_BY = ':nip') AND (upper(a.TITLE_TASK) like upper(:keyword)
    OR upper(a.TASK_DETAIL) like upper(:keyword)
    OR upper(a.ASSIGN_BY) like upper(:keyword)) `;

query.getListPegawai = `SELECT
        PEGAWAI_ID "pegawaiId", 
        NRP "nrp", 
        NAMA "nama",
        ALAMAT "alamat",
        GENDER "gender",
        DEPARTMENT_ID "departmentId",
        JABATAN "jabatan",
        KELAS "kelas",
        JENIS_PEGAWAI "jenisPegawai",
        EMAIL "email",
        TELEPON "telepon",
        WHATSAPP "whatsapp",
        USERNAME "userName",
        JENIS_PERUSAHAAN_ID "jenisPerusahaan",
        CREATED_BY "createdBy",
        CREATED_AT "createdAt",
        UPDATED_BY "updatedBy",
        UPDATED_AT "updatedAt"
    FROM M_PEGAWAI WHERE 1=1
`;

query.getCustomerBySpuc = `
SELECT 
    cp.customer_id, 
    mc.customer_name, 
    cp.portofolio_id, 
    cp.divisi, 
    cp.assigned_date, 
    cp.status
FROM customer_portofolio cp
JOIN m_customer mc ON cp.customer_id = mc.customer_id
WHERE cp.DIVISI = ':divisi' AND UPPER(mc.CUSTOMER_NAME) like upper(':keyword')`;

query.getRefDepartment = `SELECT DEPARTMENT_ID "departmentId", DEPARTMENT_NAME "departmentName" FROM M_DEPARTMENT WHERE FLAG_ACTIVE =:isY;`;

query.getListNIPByRole = `SELECT NIP FROM M_NOTIFICATION_DELIVERY A WHERE A.ROLE_ID IN (:role_id)`;

query.getNIPByRoleId = `SELECT A.USERNAME FROM M_USER A WHERE A.ROLE IN (':role_id')`;

query.getListRemarks = `SELECT a.* FROM D_REMARKS a WHERE a.PROJECT_ID = ':project_id' ORDER BY a.CREATED_DATE DESC`;

query.getListUser = `SELECT 
    ROW_NUMBER() OVER (:order_by) AS row_number, 
    a.USER_ID,
    a.USERNAME,
    b.*,
    a.ROLE 
FROM N2N.M_USER a INNER JOIN N2N.M_KARYAWAN b ON a.USERNAME = b.NIK :order_by OFFSET (:page - 1) * :limit ROWS -- Calculate offset
FETCH NEXT :limit ROWS ONLY;`;

query.countListUser = `SELECT
   count(a.USER_ID) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit"
FROM N2N.M_USER a INNER JOIN N2N.M_KARYAWAN b ON a.USERNAME = b.NIK`;

query.getAssignProject = `
SELECT 
	a.* , b.NAMA
FROM
	N2N.D_ASSIGN_PROJECT a INNER JOIN M_KARYAWAN b ON a.NIP = b.NIK 
WHERE 
	a.PROJECT_ID = :project_id`

query.getListProgressProject = `SELECT 
    ROW_NUMBER() OVER (ORDER BY a.CREATED_AT DESC) AS row_number, 
    a.PROGRESS_ID,
    a.STATUS_PROGRESS_ID,
    b.UR_REF AS STATUS_PROGRESS,
    a.PERCENTAGE,
    a.REMARK,
    a.CREATED_BY,
    a.PROJECT_ID,
    a.BILLING_ID,
    a.NILAI_PELAPORAN,
    a.PERIODE_PELAPORAN,
    TO_CHAR(TO_DATE(a.PERIODE_PELAPORAN, 'YYYY-MM'), 'Mon YYYY') AS PERIODE_PELAPORAN_UR,
    TO_CHAR(a.CREATED_AT, 'DD/MM/YYYY HH24:MI:SS') AS CREATED_AT,
    CASE 
		WHEN a.DOK_PENDUKUNG IS NOT NULL THEN CONCAT('${LINK_DOK}', a.DOK_PENDUKUNG)
		ELSE a.DOK_PENDUKUNG
	END DOK_PENDUKUNG,
    CASE
        WHEN a.PERCENTAGE < LAG(a.PERCENTAGE) OVER (PARTITION BY a.PROJECT_ID ORDER BY a.CREATED_AT) THEN 'DOWN'
        WHEN a.PERCENTAGE > LAG(a.PERCENTAGE) OVER (PARTITION BY a.PROJECT_ID ORDER BY a.CREATED_AT) THEN 'UP'
        ELSE 'SAME'
    END AS MARGIN,
    NVL(a.PERCENTAGE - LAG(a.PERCENTAGE) OVER (PARTITION BY a.PROJECT_ID ORDER BY a.CREATED_AT), 0) AS DELTA
FROM N2N.D_PROJECT_PROGRESS a LEFT JOIN N2N.M_REFERENSI b ON a.STATUS_PROGRESS_ID = b.KD_REF AND b.JNS_REF = 'status_progres_project' 
WHERE a.PROJECT_ID = ':project_id' ORDER BY a.CREATED_AT DESC`;

query.getListProgressProjectBilling = `SELECT 
ROW_NUMBER() OVER (ORDER BY a.CREATED_AT DESC) AS row_number, 
a.PROGRESS_ID,
a.STATUS_PROGRESS_ID,
--    b.UR_REF AS STATUS_PROGRESS,
a.PERCENTAGE,
a.REMARK,
a.CREATED_BY,
a.PROJECT_ID,
a.DUE_DATE,
TO_CHAR(a.CREATED_AT, 'DD/MM/YYYY HH24:MI:SS') AS CREATED_AT,
CASE
    WHEN a.PERCENTAGE < LAG(a.PERCENTAGE) OVER (PARTITION BY a.PROJECT_ID ORDER BY a.CREATED_AT) THEN 'DOWN'
    WHEN a.PERCENTAGE > LAG(a.PERCENTAGE) OVER (PARTITION BY a.PROJECT_ID ORDER BY a.CREATED_AT) THEN 'UP'
    ELSE 'SAME'
END AS MARGIN,
NVL(a.PERCENTAGE - LAG(a.PERCENTAGE) OVER (PARTITION BY a.PROJECT_ID ORDER BY a.CREATED_AT), 0) AS DELTA
FROM N2N.D_PROJECT_PROGRESS a  
WHERE a.PROJECT_ID = ':project_id' AND a.DUE_DATE IS NOT NULL  ORDER BY a.CREATED_AT DESC ;`

query.getOverall = `
WITH overall AS (SELECT COALESCE(SUM(a.NILAI_KONTRAK), 0) AS OVERALL FROM D_PROJECT a WHERE a.PROJECT_TYPE_ID = '1' AND a.KD_STATUS IN ('201', '005', '004')),
potensi AS (SELECT COALESCE(SUM(a.NILAI_KONTRAK), 0) AS POTENSI FROM D_PROJECT a WHERE KD_STATUS IN ('001', '002', '003')),
pymad AS (SELECT COALESCE(SUM(a.REAL_BILLING), 0) AS PYMAD FROM D_BILLING a WHERE KD_STATUS IN ('402')),
invoice AS (SELECT COALESCE(SUM(a.REAL_BILLING), 0) AS INVOICE FROM D_BILLING a WHERE KD_STATUS IN ('400', '405', '401'))
SELECT * FROM OVERALL 
JOIN POTENSI ON 1=1 
JOIN PYMAD ON 1=1
JOIN INVOICE ON 1=1;
`

query.getDataAreaChart = `SELECT 
(SELECT SUM(REAL_BILLING) FROM D_BILLING a :type WHERE a.KD_STATUS IN (301,400,401,402,403) AND a.REAL_PERIODE_BILLING = ':year' AND a.REAL_BULAN_BILLING = ':bulan') AS "sudah_realisasi",
(SELECT SUM(REAL_BILLING) FROM D_BILLING a :type WHERE a.KD_STATUS NOT IN (301,400,401,402,403) AND a.REAL_PERIODE_BILLING = ':year' AND a.REAL_BULAN_BILLING = ':bulan') AS "belum_realisasi" 
 FROM DUAL`;

query.getDataRadialChart = `SELECT 
 (SELECT COUNT(*) FROM D_BILLING a WHERE a.REAL_PERIODE_BILLING = ':year' OR a.EST_PERIODE_BILLING = ':year') AS "total",
 (SELECT COUNT(*) FROM D_BILLING a WHERE a.KD_STATUS = '301' AND a.REAL_PERIODE_BILLING = ':year') AS "submit",
 (SELECT COUNT(*) FROM D_BILLING a WHERE a.KD_STATUS = '302' AND a.REAL_PERIODE_BILLING = ':year') AS "reject", 
 (SELECT COUNT(*) FROM D_BILLING a WHERE a.KD_STATUS = '402' AND a.REAL_PERIODE_BILLING = ':year') AS "pymad", 
 (SELECT COUNT(*) FROM D_BILLING a WHERE a.KD_STATUS = '403' AND a.REAL_PERIODE_BILLING = ':year') AS "dokumen_lengkap", 
 (SELECT COUNT(*) FROM D_BILLING a WHERE a.KD_STATUS = '400' AND a.REAL_PERIODE_BILLING = ':year') AS "invoice", 
 (SELECT COUNT(*) FROM D_BILLING a WHERE a.KD_STATUS = '401' AND a.REAL_PERIODE_BILLING = ':year') AS "paid" 
  FROM DUAL`;

query.deleteTaskAssign = `DELETE FROM D_TASK_ASSIGN WHERE TASK_ID = ':task_id'`

query.deleteTask = `DELETE FROM D_TASK WHERE TASK_ID = ':task_id'`

query.getRMasterData = `SELECT a.*, b.* FROM R_DATA_MASTER a LEFT JOIN R_DATA_MASTER_DETAIL b ON a.MASTER_ID = b.MASTER_ID LEFT JOIN D_BILLING c ON c.BILLING_ID = a.BILLING_ID LEFT JOIN D_PROJECT d ON d.PROJECT_ID = c.PROJECT_ID WHERE d.PROJECT_id = :project_id`;

query.getRTransaction = `SELECT a.*, b.*, c.* FROM R_TRANSACTION a LEFT JOIN R_TRANSACTION_DETAIL b ON a.TRANSACTION_ID = b.TRANSACTION_ID LEFT JOIN R_DATA_MASTER c ON c.SERVICE_CODE = b.SERVICE_CODE WHERE a.BILLING_id = :billing_id ORDER BY a.CREATED_AT ASC`;

query.getDetailTransaction = `SELECT a.* FROM D_DOKUMEN a JOIN D_BILLING_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID JOIN D_BILLING c ON c.BILLING_ID = b.BILLING_ID WHERE c.BILLING_id = :billing_id AND a.JNS_DOKUMEN = '01004' AND a.JSON_DOK IS NOT NULL ORDER BY a.CREATED_AT DESC`;

query.checkPelunasan = `SELECT a.BILLING_ID, c.BILLING_REVENUE_ID, c.NO_INVOICE AS TRANS_ID from D_BILLING a INNER JOIN D_BILLING_REVENUE c ON a.BILLING_ID = c.BILLING_ID INNER JOIN R_TRANSACTION b ON a.BILLING_ID = b.BILLING_ID and a.KD_STATUS IN ('405')`;

query.checkPelunasanFromSAP = `SELECT a.BILLING_ID, c.BILLING_REVENUE_ID, c.KODE_BAYAR AS KODE_BAYAR from D_BILLING a INNER JOIN D_BILLING_REVENUE c ON a.BILLING_ID = c.BILLING_ID INNER JOIN R_TRANSACTION b ON a.BILLING_ID = b.BILLING_ID and a.KD_STATUS IN ('405')`;

query.getListReportPYMAD = `
    WITH LATEST_STATUS AS (SELECT PROJECT_ID, 
                                  MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
                                  MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
                                  MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
                                  MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
                                  MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
                                  MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
                                  MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
                                  MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
                                  MAX(CASE
                                          WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
                                          ELSE CREATED_BY
                                      END)                                                                      AS NAMA_DELIVERY 
                           FROM D_PROJECT_STATUS
                           WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406') 
                           GROUP BY PROJECT_ID),
        LATEST_STATUS_ADJUSTMENT AS (SELECT PROJECT_ID, 
                                  MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
                                  MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
                                  MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
                                  MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
                                  MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
                                  MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
                                  MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
                                  MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
                                  MAX(CASE
                                          WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
                                          ELSE CREATED_BY
                                      END)                                                                      AS NAMA_DELIVERY 
                           FROM D_PROJECT_STATUS
                           WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406') 
                           GROUP BY PROJECT_ID)
    SELECT Z.* FROM (SELECT A.BILLING_ID,
           A.BILLING_CODE,
           A.PROJECT_ID,
           B.PROJECT_NO,
           B.PROJECT_NAME,
           A.DIVISI_ID,
           C.CUSTOMER_NAME,
           A.TERMIN,
           A.KD_STATUS,
           D.PORTOFOLIO,
           E.NAMA_DELIVERY,
           A.KETERANGAN,
           A.DESC_TERMIN,
           F.NO_INVOICE,
           CASE 
                WHEN A.KD_STATUS = '303' THEN
                'Req. Faktur' 
                WHEN A.KD_STATUS = '302' THEN
                'Rejected' 
                WHEN A.KD_STATUS = '301' THEN
                    'Sent' 
                WHEN A.KD_STATUS = '400' THEN
                    'Invoice' 
                WHEN A.KD_STATUS = '401' THEN
                    'Paid' 
                WHEN A.KD_STATUS = '402' THEN
                    'PYMAD' 
                WHEN A.KD_STATUS = '403' THEN
                    'Completed' 
                WHEN A.KD_STATUS = '406' THEN
                    'Batal PYMAD' 
                ELSE '-' END                         
            AS STATUS,
            CASE 
                WHEN A.KD_STATUS IN ('400', '401', '403') THEN 
                1 
                ELSE 0 END 
            AS FLAG_REJECT,
            NVL(F.NOMINAL_PYMAD, A.REAL_BILLING) AS NOMINAL,
            A.REAL_BULAN_BILLING,
            A.REAL_PERIODE_BILLING,
           CASE
               WHEN F.STATUS_PELUNASAN = 'T' THEN to_char(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY')
               WHEN F.STATUS_INVOICE = 'T' THEN to_char(F.TANGGAL_INVOICE, 'DD/MM/YYYY')
               ELSE '-' END                          AS TANGGAL,
           CONCAT(to_char(b.MARGIN_PRESENTASE), '%') AS "MARGIN_PRESENTASE",
           G.URAIAN                                  AS "URAIAN_STATUS",
           E.LATEST_DATE_STATUS,
           TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
           TO_CHAR(
            LAST_DAY(TO_DATE('01-' || A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY')),
            'DD-Mon-YYYY'
            ) AS TANGGAL_ACRUE,
           ABS(TRUNC(LAST_DAY(TO_DATE('01-' || :month, 'DD-MM-YYYY'))) - TRUNC(LAST_DAY(TO_DATE('01-' || A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY')))) AS UMUR_PYMAD,
           E.SLA_KD_START                              AS "SLA0_START",
           E.SLA_KD_END                              AS "SLA0_END",
           E.SLA_SUBMIT_START                              AS "SLA1_START",
           E.SLA_INVOICE_START                              AS "SLA1_END",
           E.SLA_INVOICE_START                              AS "SLA2_START",
           E.SLA_PAID                                AS "SLA2_END",
           E.KETERANGAN_REJECT,
           E.KETERANGAN_REQ_FAKTUR  
    FROM N2N.D_BILLING A
             LEFT JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ID
             LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
             LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
             LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
             LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = COALESCE(F.CUSTOMER_ID_TO_SAP, B.CUSTOMER_ID) 
             LEFT JOIN N2N.M_STATUS G
                       ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1') 
    WHERE ((A.FLAG_PARENT = 1 AND A.PARENT_ID IS NULL AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.PARENT_ID = A.BILLING_ID) = 0) OR (A.FLAG_PARENT = 0 AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.BILLING_ID = A.PARENT_ID AND db.FLAG_PARENT = 2) = 0) OR A.FLAG_PARENT = 2) 
    AND REGEXP_LIKE(TO_CHAR(A.REAL_BULAN_BILLING), '^(0?[1-9]|1[0-2])$')
    AND REGEXP_LIKE(TO_CHAR(A.REAL_PERIODE_BILLING), '^[0-9]{4}$') 
    AND (SELECT COUNT(dpss.STATUS_ID) FROM D_PROJECT_STATUS dpss WHERE dpss.PROJECT_ID = A.BILLING_ID AND dpss.KD_STATUS = '402') > 0 
    --AND (SELECT COUNT(dpss.STATUS_ID) FROM D_PROJECT_STATUS dpss WHERE dpss.PROJECT_ID = A.BILLING_ID AND dpss.KD_STATUS IN ('400','401','405','406')) < 1 
    AND (LPAD(A.REAL_BULAN_BILLING, 2, '0') || '-' || A.REAL_PERIODE_BILLING = :month OR TO_DATE('01-' || LPAD(A.REAL_BULAN_BILLING, 2, 0) || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY') < TO_DATE('01-' || :month, 'DD-MM-YYYY')) AND A.KD_STATUS NOT IN ('302') AND A.BILLING_ID NOT IN (
    WITH LATEST_STATUS AS (SELECT PROJECT_ID, 
                                  MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
                                  MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
                                  MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
                                  MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
                                  MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
                                  MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
                                  MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
                                  MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
                                  MAX(CASE
                                          WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
                                          ELSE CREATED_BY
                                      END)                                                                      AS NAMA_DELIVERY 
                           FROM D_PROJECT_STATUS
                           WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406') 
                           GROUP BY PROJECT_ID),
                           STATUS_INVOICE AS (
                            SELECT
                                dps.DATE_STATUS, dps.PROJECT_ID 
                            FROM
                                D_PROJECT_STATUS dps
                            WHERE
                                dps.KD_STATUS IN ('400','401','405','406'))
    SELECT A.BILLING_ID 
    FROM N2N.D_BILLING A
             LEFT JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ID
             LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
             LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
             LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID 
             LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = COALESCE(F.CUSTOMER_ID_TO_SAP, B.CUSTOMER_ID) 
             LEFT JOIN STATUS_INVOICE SI ON SI.PROJECT_ID = A.BILLING_ID 
             LEFT JOIN N2N.M_STATUS G
                       ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1') 
    WHERE ((A.FLAG_PARENT = 1 AND A.PARENT_ID IS NULL AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.PARENT_ID = A.BILLING_ID) = 0) OR (A.FLAG_PARENT = 0 AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.BILLING_ID = A.PARENT_ID AND db.FLAG_PARENT = 2) = 0) OR A.FLAG_PARENT = 2) 
    AND REGEXP_LIKE(TO_CHAR(A.REAL_BULAN_BILLING), '^(0?[1-9]|1[0-2])$')
    AND REGEXP_LIKE(TO_CHAR(A.REAL_PERIODE_BILLING), '^[0-9]{4}$') 
    AND (SELECT COUNT(dpss.STATUS_ID) FROM D_PROJECT_STATUS dpss WHERE dpss.PROJECT_ID = A.BILLING_ID AND dpss.KD_STATUS = '402') > 0 AND A.KD_STATUS IN ('400','405','401','406') 
    AND TRUNC(SI.DATE_STATUS, 'MM') <= TO_DATE(:month, 'MM-YYYY') 
    AND (TO_DATE('01-' || LPAD(A.REAL_BULAN_BILLING, 2, 0) || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY') <= TO_DATE('01-' || :month, 'DD-MM-YYYY'))
    )
    UNION 
    SELECT A.BILLING_ID,
            '' AS BILLING_CODE,
           A.PROJECT_ID,
           '' PROJECT_NO,
           A.PROJECT_NAME,
           '' DIVISI_ID,
           C.CUSTOMER_NAME,
           '' TERMIN,
           A.KD_STATUS,
           '' PORTOFOLIO,
           '' NAMA_DELIVERY,
           A.KETERANGAN,
           A.KETERANGAN DESC_TERMIN,
           F.NO_INVOICE,
           CASE 
                WHEN A.KD_STATUS = '303' THEN
                'Req. Faktur' 
                WHEN A.KD_STATUS = '302' THEN
                'Rejected' 
                WHEN A.KD_STATUS = '301' THEN
                    'Sent' 
                WHEN A.KD_STATUS = '400' THEN
                    'Invoice' 
                WHEN A.KD_STATUS = '401' THEN
                    'Paid' 
                WHEN A.KD_STATUS = '402' THEN
                    'PYMAD' 
                WHEN A.KD_STATUS = '403' THEN
                    'Completed' 
                ELSE '-' END                         
            AS STATUS,
            CASE 
                WHEN A.KD_STATUS IN ('400', '401', '403') THEN 
                1 
                ELSE 0 END 
            AS FLAG_REJECT,
            A.REAL_BILLING AS NOMINAL,
            A.REAL_BULAN_BILLING,
            A.REAL_PERIODE_BILLING,
           CASE
               WHEN F.STATUS_PELUNASAN = 'T' THEN to_char(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY')
               WHEN F.STATUS_INVOICE = 'T' THEN to_char(F.TANGGAL_INVOICE, 'DD/MM/YYYY')
               ELSE '-' END                          AS TANGGAL,
           '' AS "MARGIN_PRESENTASE",
           G.URAIAN                                  AS "URAIAN_STATUS",
           E.LATEST_DATE_STATUS,
           TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
           TO_CHAR(
            LAST_DAY(TO_DATE('01-' || A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY')),
            'DD-Mon-YYYY'
            ) AS TANGGAL_ACRUE,
           ABS(TRUNC(LAST_DAY(TO_DATE('01-' || :month, 'DD-MM-YYYY'))) - TRUNC(LAST_DAY(TO_DATE('01-' || A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY')))) AS UMUR_PYMAD,
           E.SLA_KD_START                              AS "SLA0_START",
           E.SLA_KD_END                              AS "SLA0_END",
           E.SLA_SUBMIT_START                              AS "SLA1_START",
           E.SLA_INVOICE_START                              AS "SLA1_END",
           E.SLA_INVOICE_START                              AS "SLA2_START",
           E.SLA_PAID                                AS "SLA2_END",
           E.KETERANGAN_REJECT,
           E.KETERANGAN_REQ_FAKTUR 
    FROM N2N.D_BILLING_ADJUSTMENT A
             LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = A.CUSTOMER_ID
             LEFT JOIN LATEST_STATUS_ADJUSTMENT E ON E.PROJECT_ID = A.BILLING_ID
             LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
             LEFT JOIN N2N.M_STATUS G
                       ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1') 
            WHERE A.JNS_ADJUST = 'PYMAD' AND 
            REGEXP_LIKE(TO_CHAR(A.REAL_BULAN_BILLING), '^(0?[1-9]|1[0-2])$')
            AND REGEXP_LIKE(TO_CHAR(A.REAL_PERIODE_BILLING), '^[0-9]{4}$') 
            AND (TO_DATE('01-' || LPAD(A.REAL_BULAN_BILLING, 2, 0) || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY') <= LAST_DAY(TO_DATE('01-' || :month, 'DD-MM-YYYY')))
    ) Z ORDER BY Z.REAL_PERIODE_BILLING ASC, Z.REAL_BULAN_BILLING ;`

query.getListReportPYMADMutasiTambah = `
    WITH LATEST_STATUS AS (SELECT PROJECT_ID, 
                                  MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
                                  MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
                                  MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
                                  MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
                                  MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
                                  MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
                                  MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
                                  MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
                                  MAX(CASE
                                          WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
                                          ELSE CREATED_BY
                                      END)                                                                      AS NAMA_DELIVERY 
                           FROM D_PROJECT_STATUS
                           WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406') 
                           GROUP BY PROJECT_ID)
    SELECT A.BILLING_ID,
           A.BILLING_CODE,
           A.PROJECT_ID,
           B.PROJECT_NO,
           B.PROJECT_NAME,
           B.KD_SPUC,
           A.DIVISI_ID,
           C.CUSTOMER_NAME,
           A.TERMIN,
           A.KD_STATUS,
           D.PORTOFOLIO,
           E.NAMA_DELIVERY,
           A.KETERANGAN,
           A.DESC_TERMIN,
           F.NO_INVOICE,
           CASE 
                WHEN A.KD_STATUS = '303' THEN
                'Req. Faktur' 
                WHEN A.KD_STATUS = '302' THEN
                'Rejected' 
                WHEN A.KD_STATUS = '301' THEN
                    'Sent' 
                WHEN A.KD_STATUS = '400' THEN
                    'Invoice' 
                WHEN A.KD_STATUS = '401' THEN
                    'Paid' 
                WHEN A.KD_STATUS = '402' THEN
                    'PYMAD' 
                WHEN A.KD_STATUS = '403' THEN
                    'Completed' 
                WHEN A.KD_STATUS = '406' THEN
                    'Batal PYMAD' 
                ELSE '-' END                         
            AS STATUS,
            CASE 
                WHEN A.KD_STATUS IN ('400', '401', '403') THEN 
                1 
                ELSE 0 END 
            AS FLAG_REJECT, 
           --CASE
            --WHEN F.STATUS_PYMAD = 'T' THEN F.NOMINAL_PYMAD 
            --WHEN F.STATUS_INVOICE = 'T' THEN F.NOMINAL_INVOICE 
               --ELSE a.REAL_BILLING END               AS NOMINAL,
            NVL(F.NOMINAL_PYMAD, A.REAL_BILLING) AS NOMINAL,
            a.REAL_BILLING AS NILAI_REVENUE,
	        TO_CHAR(LAST_DAY(TO_DATE('01-'||A.REAL_BULAN_BILLING||'-'||A.REAL_PERIODE_BILLING,'DD-MM-YYYY')),'DD-Mon-YYYY') AS GL_DATA_ACCRUE,
            a.DOC_NUMBER,
           CASE
               WHEN F.STATUS_PELUNASAN = 'T' THEN to_char(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY')
               WHEN F.STATUS_INVOICE = 'T' THEN to_char(F.TANGGAL_INVOICE, 'DD/MM/YYYY')
               ELSE '-' END                          AS TANGGAL,
           CONCAT(to_char(b.MARGIN_PRESENTASE), '%') AS "MARGIN_PRESENTASE",
           G.URAIAN                                  AS "URAIAN_STATUS",
           E.LATEST_DATE_STATUS,
           TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
           TO_CHAR(
            LAST_DAY(TO_DATE('01-' || A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY')),
            'DD-Mon-YYYY'
            ) AS TANGGAL_ACRUE,
           ABS(TRUNC(LAST_DAY(TO_DATE('01-' || :month, 'DD-MM-YYYY'))) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) AS UMUR_PYMAD,
           E.SLA_KD_START                              AS "SLA0_START",
           E.SLA_KD_END                              AS "SLA0_END",
           E.SLA_SUBMIT_START                              AS "SLA1_START",
           E.SLA_INVOICE_START                              AS "SLA1_END",
           E.SLA_INVOICE_START                              AS "SLA2_START",
           E.SLA_PAID                                AS "SLA2_END",
           E.KETERANGAN_REJECT,
           E.KETERANGAN_REQ_FAKTUR  
    FROM N2N.D_BILLING A
             LEFT JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ID
             LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
             LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
             LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
             LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = COALESCE(F.CUSTOMER_ID_TO_SAP, B.CUSTOMER_ID) 
             LEFT JOIN N2N.M_STATUS G
                       ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1') 
    WHERE ((A.FLAG_PARENT = 1 AND A.PARENT_ID IS NULL AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.PARENT_ID = A.BILLING_ID) = 0) OR (A.FLAG_PARENT = 0 AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.BILLING_ID = A.PARENT_ID AND db.FLAG_PARENT = 2) = 0) OR A.FLAG_PARENT = 2) 
    AND REGEXP_LIKE(TO_CHAR(A.REAL_BULAN_BILLING), '^(0?[1-9]|1[0-2])$')
    AND REGEXP_LIKE(TO_CHAR(A.REAL_PERIODE_BILLING), '^[0-9]{4}$') 
    AND (SELECT COUNT(dpss.STATUS_ID) FROM D_PROJECT_STATUS dpss WHERE dpss.PROJECT_ID = A.BILLING_ID AND dpss.KD_STATUS = '402') > 0 
    AND (LPAD(A.REAL_BULAN_BILLING, 2, '0') || '-' || A.REAL_PERIODE_BILLING = :month) 
    ORDER BY A.REAL_PERIODE_BILLING ASC, A.REAL_BULAN_BILLING;`

query.getListReportPYMADMutasiKurang = `
    WITH LATEST_STATUS AS (SELECT PROJECT_ID, 
                                  MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
                                  MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
                                  MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
                                  MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
                                  MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
                                  MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
                                  MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
                                  MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
                                  MAX(CASE
                                          WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
                                          ELSE CREATED_BY
                                      END)                                                                      AS NAMA_DELIVERY 
                           FROM D_PROJECT_STATUS
                           WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403', '406') 
                           GROUP BY PROJECT_ID),
                           STATUS_INVOICE AS (
                            SELECT *
                            FROM (
                                SELECT 
                                    dps.DATE_STATUS,
                                    dps.PROJECT_ID,
                                    ROW_NUMBER() OVER (
                                        PARTITION BY dps.PROJECT_ID 
                                        ORDER BY dps.DATE_STATUS DESC
                                    ) AS RN
                                FROM D_PROJECT_STATUS dps
                                WHERE dps.KD_STATUS = '400'
                            )
                            WHERE RN = 1)
    SELECT A.BILLING_ID,
           A.BILLING_CODE,
           A.PROJECT_ID,
           B.PROJECT_NO,
           B.PROJECT_NAME,
           A.DIVISI_ID,
           C.CUSTOMER_NAME,
           A.TERMIN,
           A.KD_STATUS,
           D.PORTOFOLIO,
           E.NAMA_DELIVERY,
           A.KETERANGAN,
           A.DESC_TERMIN,
           F.NO_INVOICE,
           CASE 
                WHEN A.KD_STATUS = '303' THEN
                'Req. Faktur' 
                WHEN A.KD_STATUS = '302' THEN
                'Rejected' 
                WHEN A.KD_STATUS = '301' THEN
                    'Sent' 
                WHEN A.KD_STATUS = '400' THEN
                    'Invoice' 
                WHEN A.KD_STATUS = '401' THEN
                    'Paid' 
                WHEN A.KD_STATUS = '402' THEN
                    'PYMAD' 
                WHEN A.KD_STATUS = '403' THEN
                    'Completed' 
                ELSE '-' END                         
            AS STATUS,
            CASE 
                WHEN A.KD_STATUS IN ('400', '401', '403') THEN 
                1 
                ELSE 0 END 
            AS FLAG_REJECT, 
           --CASE
            --WHEN F.STATUS_PYMAD = 'T' THEN F.NOMINAL_PYMAD 
            --WHEN F.STATUS_INVOICE = 'T' THEN F.NOMINAL_INVOICE 
               --ELSE a.REAL_BILLING END               AS NOMINAL,
            NVL(F.NOMINAL_PYMAD, A.REAL_BILLING) AS NOMINAL,
           CASE
               WHEN F.STATUS_PELUNASAN = 'T' THEN to_char(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY')
               WHEN F.STATUS_INVOICE = 'T' THEN to_char(F.TANGGAL_INVOICE, 'DD/MM/YYYY')
               ELSE '-' END                          AS TANGGAL,
           CONCAT(to_char(b.MARGIN_PRESENTASE), '%') AS "MARGIN_PRESENTASE",
           G.URAIAN                                  AS "URAIAN_STATUS",
           E.LATEST_DATE_STATUS,
           TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
           TO_CHAR(SI.DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS_INVOICE,
           TO_CHAR(
            LAST_DAY(TO_DATE('01-' || A.REAL_BULAN_BILLING || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY')),
            'DD-Mon-YYYY'
            ) AS TANGGAL_ACRUE,
           ABS(TRUNC(LAST_DAY(TO_DATE('01-' || :month, 'DD-MM-YYYY'))) - TRUNC(LAST_DAY(E.LATEST_DATE_STATUS))) AS UMUR_PYMAD,
           E.SLA_KD_START                              AS "SLA0_START",
           E.SLA_KD_END                              AS "SLA0_END",
           E.SLA_SUBMIT_START                              AS "SLA1_START",
           E.SLA_INVOICE_START                              AS "SLA1_END",
           E.SLA_INVOICE_START                              AS "SLA2_START",
           E.SLA_PAID                                AS "SLA2_END",
           E.KETERANGAN_REJECT,
           E.KETERANGAN_REQ_FAKTUR  
    FROM N2N.D_BILLING A
             LEFT JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ID
             LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
             LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
             LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID 
             LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = COALESCE(F.CUSTOMER_ID_TO_SAP, B.CUSTOMER_ID)
             LEFT JOIN STATUS_INVOICE SI ON SI.PROJECT_ID = A.BILLING_ID 
             LEFT JOIN N2N.M_STATUS G
                       ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1') 
    WHERE ((A.FLAG_PARENT = 1 AND A.PARENT_ID IS NULL AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.PARENT_ID = A.BILLING_ID) = 0) OR (A.FLAG_PARENT = 0 AND (SELECT COUNT(db.BILLING_ID) FROM D_BILLING db WHERE db.BILLING_ID = A.PARENT_ID AND db.FLAG_PARENT = 2) = 0) OR A.FLAG_PARENT = 2) 
    AND REGEXP_LIKE(TO_CHAR(A.REAL_BULAN_BILLING), '^(0?[1-9]|1[0-2])$')
    AND REGEXP_LIKE(TO_CHAR(A.REAL_PERIODE_BILLING), '^[0-9]{4}$') 
    AND (SELECT COUNT(dpss.STATUS_ID) FROM D_PROJECT_STATUS dpss WHERE dpss.PROJECT_ID = A.BILLING_ID AND dpss.KD_STATUS = '402') > 0 AND A.KD_STATUS IN ('400','405','401') 
    AND TO_CHAR(SI.DATE_STATUS, 'MM-YYYY') = :month 
    AND TO_CHAR(TO_DATE(LPAD(A.REAL_BULAN_BILLING, 2, 0) || '-' || A.REAL_PERIODE_BILLING, 'MM-YYYY'), 'MM-YYYY') != TO_CHAR(SI.DATE_STATUS, 'MM-YYYY') 
    AND (TO_DATE('01-' || LPAD(A.REAL_BULAN_BILLING, 2, 0) || '-' || A.REAL_PERIODE_BILLING, 'DD-MM-YYYY') <= TO_DATE('01-' || :month, 'DD-MM-YYYY')) 
    ORDER BY A.REAL_PERIODE_BILLING ASC, A.REAL_BULAN_BILLING;`
// old 08-04-2026
// query.getListReportPiutang = `
//     WITH LATEST_STATUS AS (SELECT PROJECT_ID, 
//                             MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
//                             MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
//                             MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
//                             MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
//                             MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
//                             MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
//                             MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
//                             MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
//                             MAX(CASE
//                                     WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
//                                     ELSE CREATED_BY
//                                 END)                                                                      AS NAMA_DELIVERY 
//                     FROM D_PROJECT_STATUS
//                     WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403') 
//                     GROUP BY PROJECT_ID)
//     SELECT A.BILLING_ID,
//         A.BILLING_CODE,
//         A.PROJECT_ID,
//         B.PROJECT_NO,
//         B.PROJECT_NAME,
//         A.DIVISI_ID,
//         C.CUSTOMER_NAME,
//         A.TERMIN,
//         A.KD_STATUS,
//         D.PORTOFOLIO,
//         E.NAMA_DELIVERY,
//         A.KETERANGAN,
//         A.DESC_TERMIN,
//         F.NO_INVOICE,
//         F.NOMINAL_DPP,
//         F.PPN_TARIF NOMINAL_PPN,
//         F.PPH NOMINAL_PPH,
//         CASE 
//             WHEN F.WAPU = 'X' THEN F.NOMINAL_INVOICE
//             WHEN C.WAPU = 'Y' THEN F.NOMINAL_DPP 
//             ELSE (F.NOMINAL_DPP + F.PPN_TARIF) 
//             END 
//             AS NOMINAL_INVOICE,
//         CASE 
//                 WHEN A.KD_STATUS = '303' THEN
//                 'Req. Faktur' 
//                 WHEN A.KD_STATUS = '302' THEN
//                 'Rejected' 
//                 WHEN A.KD_STATUS = '301' THEN
//                     'Sent' 
//                 WHEN A.KD_STATUS = '400' THEN
//                     'Invoice' 
//                 WHEN A.KD_STATUS = '401' THEN
//                     'Paid' 
//                 WHEN A.KD_STATUS = '402' THEN
//                     'PYMAD' 
//                 WHEN A.KD_STATUS = '403' THEN
//                     'Completed' 
//                 ELSE '-' END                         
//             AS STATUS,
//         CASE
//             WHEN F.STATUS_PYMAD = 'T' THEN F.NOMINAL_PYMAD 
//             WHEN F.STATUS_INVOICE = 'T' THEN F.NOMINAL_INVOICE 
//             ELSE a.REAL_BILLING END               AS NOMINAL,
//         CASE
//             WHEN F.STATUS_PELUNASAN = 'T' THEN to_char(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY')
//             WHEN F.STATUS_INVOICE = 'T' THEN to_char(F.TANGGAL_INVOICE, 'DD/MM/YYYY')
//             ELSE '-' END                          AS TANGGAL,
//         G.URAIAN                                  AS "URAIAN_STATUS",
//         E.LATEST_DATE_STATUS,
//         TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
//         TO_CHAR((SELECT DPS.DATE_STATUS FROM D_PROJECT_STATUS DPS WHERE DPS.KD_STATUS = '400' AND DPS.PROJECT_ID = A.BILLING_ID ORDER BY DPS.DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY), 'DD-Mon-YYYY') AS TANGGAL_CREATED_INVOICE,
//         TO_CHAR(CASE WHEN F.TANGGAL_POSTING IS NOT NULL THEN F.TANGGAL_POSTING ELSE F.TANGGAL_INVOICE END, 'DD-Mon-YYYY') AS TANGGAL_INVOICE,
//         TO_CHAR(dsts.TANGGAL_TAGIHAN, 'DD-Mon-YYYY') AS TANGGAL_TAGIHAN,
//         TO_CHAR(LAST_DAY(E.LATEST_DATE_STATUS), 'DD-Mon-YYYY') AS TANGGAL_ACRUE 
//     FROM N2N.D_BILLING A
//             LEFT JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ID
//             LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
//             LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
//             LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
//             LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = COALESCE(F.CUSTOMER_ID_TO_SAP, B.CUSTOMER_ID)
//             LEFT JOIN N2N.M_STATUS G
//                     ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1')
//             LEFT JOIN (
//                 SELECT 
//                     BILLING_ID,
//                     MAX(WAKTU_AKSI) AS TANGGAL_TAGIHAN
//                 FROM N2N.D_SURAT_TAGIHAN_STATUS
//                 GROUP BY BILLING_ID
//             ) dsts ON dsts.BILLING_ID = A.BILLING_ID
//     WHERE A.FLAG_PARENT IN (1,2) AND (SELECT COUNT(dps.PROJECT_ID) FROM D_PROJECT_STATUS dps WHERE dps.KD_STATUS IN ('400', '405') AND dps.PROJECT_ID = A.BILLING_ID AND (TO_CHAR(dps.DATE_STATUS, 'MM-YYYY') = :month OR dps.DATE_STATUS < TO_DATE('01-' || :month, 'DD-MM-YYYY'))) > 0 AND (SELECT COUNT(dps.PROJECT_ID) FROM D_PROJECT_STATUS dps WHERE dps.KD_STATUS = '401' AND dps.PROJECT_ID = A.BILLING_ID AND (TO_CHAR(dps.DATE_STATUS, 'MM-YYYY') = :month OR dps.DATE_STATUS < TO_DATE('01-' || :month, 'DD-MM-YYYY'))) = 0 
//     ORDER BY C.KODE_AKUN ASC, A.TERMIN ASC;
//     `;
// query.getListReportPiutang = `
// WITH LATEST_STATUS AS (
// SELECT
// 	PROJECT_ID,
// 	MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
// 	MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_KD_START,
// 	MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_KD_END,
// 	MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_SUBMIT_START,
// 	MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_INVOICE_START,
// 	MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END) AS SLA_PAID,
// 	MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
// 	MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
// 	MAX(CASE
//                                     WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
//                                     ELSE CREATED_BY
//                                 END) AS NAMA_DELIVERY
// FROM
// 	D_PROJECT_STATUS
// WHERE
// 	KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403')
// GROUP BY
// 	PROJECT_ID),
// 	LATEST_400 AS (
// SELECT
// 	PROJECT_ID,
// 	DATE_STATUS AS LATEST_400_DATE,
// 	ROW_NUMBER() OVER (PARTITION BY PROJECT_ID
// ORDER BY
// 	DATE_STATUS DESC) AS rn
// FROM
// 	D_PROJECT_STATUS
// WHERE
// 	KD_STATUS = '400'
// )
// SELECT
// 	A.BILLING_ID,
// 	A.BILLING_CODE,
// 	A.PROJECT_ID,
// 	B.PROJECT_NO,
// 	B.PROJECT_NAME,
// 	A.DIVISI_ID,
// 	C.CUSTOMER_NAME,
// 	A.TERMIN,
// 	A.KD_STATUS,
// 	D.PORTOFOLIO,
// 	E.NAMA_DELIVERY,
// 	A.KETERANGAN,
// 	A.DESC_TERMIN,
// 	F.NO_INVOICE,
// 	F.NOMINAL_DPP,
// 	F.PPN_TARIF NOMINAL_PPN,
// 	F.PPH NOMINAL_PPH,
// 	CASE
// 		WHEN F.WAPU = 'X' THEN F.NOMINAL_INVOICE
// 		WHEN C.WAPU = 'Y' THEN F.NOMINAL_DPP
// 		ELSE (F.NOMINAL_DPP + F.PPN_TARIF)
// 	END 
//             AS NOMINAL_INVOICE,
// 	CASE
// 		WHEN A.KD_STATUS = '303' THEN
//                 'Req. Faktur'
// 		WHEN A.KD_STATUS = '302' THEN
//                 'Rejected'
// 		WHEN A.KD_STATUS = '301' THEN
//                     'Sent'
// 		WHEN A.KD_STATUS = '400' THEN
//                     'Invoice'
// 		WHEN A.KD_STATUS = '401' THEN
//                     'Paid'
// 		WHEN A.KD_STATUS = '402' THEN
//                     'PYMAD'
// 		WHEN A.KD_STATUS = '403' THEN
//                     'Completed'
// 		ELSE '-'
// 	END                         
//             AS STATUS,
// 	CASE
// 		WHEN F.STATUS_PYMAD = 'T' THEN F.NOMINAL_PYMAD
// 		WHEN F.STATUS_INVOICE = 'T' THEN F.NOMINAL_INVOICE
// 		ELSE a.REAL_BILLING
// 	END AS NOMINAL,
// 	CASE
// 		WHEN F.STATUS_PELUNASAN = 'T' THEN to_char(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY')
// 		WHEN F.STATUS_INVOICE = 'T' THEN to_char(F.TANGGAL_INVOICE, 'DD/MM/YYYY')
// 		ELSE '-'
// 	END AS TANGGAL,
// 	G.URAIAN AS "URAIAN_STATUS",
// 	E.LATEST_DATE_STATUS,
// 	TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
// 	TO_CHAR((SELECT DPS.DATE_STATUS FROM D_PROJECT_STATUS DPS WHERE DPS.KD_STATUS = '400' AND DPS.PROJECT_ID = A.BILLING_ID ORDER BY DPS.DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY), 'DD-Mon-YYYY') AS TANGGAL_CREATED_INVOICE,
// 	TO_CHAR(CASE WHEN F.TANGGAL_POSTING IS NOT NULL THEN F.TANGGAL_POSTING ELSE F.TANGGAL_INVOICE END, 'DD-Mon-YYYY') AS TANGGAL_INVOICE,
// 	TO_CHAR(dsts.TANGGAL_TAGIHAN, 'DD-Mon-YYYY') AS TANGGAL_TAGIHAN,
// 	TO_CHAR(LAST_DAY(E.LATEST_DATE_STATUS), 'DD-Mon-YYYY') AS TANGGAL_ACRUE
// FROM
// 	N2N.D_BILLING A
// LEFT JOIN D_PROJECT B ON
// 	B.PROJECT_ID = A.PROJECT_ID
// LEFT JOIN N2N.M_PORTOFOLIO D ON
// 	D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
// LEFT JOIN LATEST_STATUS E ON
// 	E.PROJECT_ID = A.BILLING_ID
// LEFT JOIN N2N.D_BILLING_REVENUE F ON
// 	F.BILLING_ID = A.BILLING_ID
// LEFT JOIN N2N.M_CUSTOMER C ON
// 	C.CUSTOMER_ID = COALESCE(F.CUSTOMER_ID_TO_SAP, B.CUSTOMER_ID)
// LEFT JOIN N2N.M_STATUS G
//                     ON
// 	G.KD_STATUS = A.KD_STATUS
// 	AND (G.ID_TAB_STATUS = 'FN1'
// 		OR G.ID_TAB_STATUS = 'DL1')
// LEFT JOIN (
// 	SELECT
// 		BILLING_ID,
// 		MAX(WAKTU_AKSI) AS TANGGAL_TAGIHAN
// 	FROM
// 		N2N.D_SURAT_TAGIHAN_STATUS
// 	GROUP BY
// 		BILLING_ID
//             ) dsts ON
// 	dsts.BILLING_ID = A.BILLING_ID
// LEFT JOIN LATEST_400 L400 ON
// 	L400.PROJECT_ID = A.BILLING_ID
// 	AND L400.rn = 1
// WHERE
// 	A.FLAG_PARENT IN (1, 2)
// 	AND (
// 	SELECT
// 		COUNT(dps.PROJECT_ID)
// 	FROM
// 		D_PROJECT_STATUS dps
// 	WHERE
// 		dps.KD_STATUS IN ('400', '405')
// 			AND dps.PROJECT_ID = A.BILLING_ID
// 			) > 0
// 	AND L400.LATEST_400_DATE IS NOT NULL
// 	-- Filter berdasarkan bulan untuk 400 terbaru
// 	AND (TO_CHAR(L400.LATEST_400_DATE, 'MM-YYYY') = :month
// 		OR L400.LATEST_400_DATE < TO_DATE('01-' || :month, 'DD-MM-YYYY'))
// 	AND (
// 	SELECT
// 		COUNT(dps.PROJECT_ID)
// 	FROM
// 		D_PROJECT_STATUS dps
// 	WHERE
// 		dps.KD_STATUS = '401'
// 		AND dps.PROJECT_ID = A.BILLING_ID
// 		AND (TO_CHAR(dps.DATE_STATUS, 'MM-YYYY') = :month
// 			OR dps.DATE_STATUS < TO_DATE('01-' || :month, 'DD-MM-YYYY'))) = 0
// ORDER BY
// 	C.KODE_AKUN ASC,
// 	A.TERMIN ASC;
// `
query.getListReportPiutang = `
SELECT A.SOURCE_ID,
       B.BILLING_CODE,
       E.CUSTOMER_NAME,
       D.PROJECT_NO,
       D.PROJECT_NAME,
       B.TERMIN,
       B.DESC_TERMIN,
       A.NO_DOKUMEN AS NO_INVOICE,
       TO_CHAR(A.TGL_DOKUMEN, 'DD-MM-YYYY') AS TANGGAL_INVOICE,
       TO_CHAR(A.TGL_EVENT, 'DD-MM-YYYY') AS TANGGAL_CREATED_INVOICE,
       TO_CHAR(F.ACTIVE_DATE, 'DD-MM-YYYY') AS TANGGAL_TAGIHAN,
       A.DPP AS NOMINAL_DPP,
       A.NILAI_PPN AS NOMINAL_PPN,
       A.NILAI_INVOICE AS NOMINAL_INVOICE,
       A.PERIODE,
       A.ACTIVE_DATE,
       to_Char(A.INACTIVE_DATE, 'yyyymm'),
       F.REPORTING_ID
FROM R_KEUANGAN A
         JOIN D_BILLING B ON B.BILLING_ID = A.SOURCE_ID
         JOIN D_BILLING_REVENUE C ON C.BILLING_ID = A.SOURCE_ID
         JOIN D_PROJECT D ON D.PROJECT_ID = A.PROJECT_ID
         JOIN M_CUSTOMER E ON E.CUSTOMER_ID = COALESCE(C.CUSTOMER_ID_TO_SAP, D.CUSTOMER_ID)
         LEFT JOIN R_KEUANGAN F
                   ON F.SUB_REPORTING_ID = A.REPORTING_ID AND F.EVENT_CODE = 'SURAT TAGIHAN' AND F.IS_CONDITION = 'A'
WHERE A.EVENT_CODE = 'INVOICE'
  AND TO_CHAR(A.ACTIVE_DATE, 'YYYYMM') <= :p_periode
  AND (
    A.INACTIVE_DATE IS NULL
        OR TO_CHAR(A.INACTIVE_DATE, 'YYYYMM') > :p_periode
    );
`

query.getListReportPiutang2 = `
WITH LATEST_STATUS AS (SELECT PROJECT_ID, 
                                  MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
                                  MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
                                  MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
                                  MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
                                  MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
                                  MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
                                  MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
                                  MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
                                  MAX(CASE
                                          WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
                                          ELSE CREATED_BY
                                      END)                                                                      AS NAMA_DELIVERY 
                           FROM D_PROJECT_STATUS
                           WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403') 
                           GROUP BY PROJECT_ID),
    -- CTE baru untuk mengambil status 400 terakhir
    LAST_STATUS_400 AS (
        SELECT PROJECT_ID, 
               MAX(DATE_STATUS) AS LAST_DATE_STATUS_400,
               TO_CHAR(MAX(DATE_STATUS), 'MM-YYYY') AS LAST_MONTH_STATUS_400,
               TO_CHAR(MAX(DATE_STATUS), 'DD-Mon-YYYY') AS LAST_DATE_FORMATTED
        FROM D_PROJECT_STATUS
        WHERE KD_STATUS = '400'
        GROUP BY PROJECT_ID
    )
    SELECT A.BILLING_ID,
           A.BILLING_CODE,
           A.PROJECT_ID,
           B.PROJECT_NO,
           B.PROJECT_NAME,
           A.DIVISI_ID,
           C.CUSTOMER_NAME,
           A.TERMIN,
           A.KD_STATUS,
           D.PORTOFOLIO,
           E.NAMA_DELIVERY,
           A.KETERANGAN,
           A.DESC_TERMIN,
           F.NO_INVOICE,
           F.NOMINAL_DPP,
           F.PPN_TARIF NOMINAL_PPN,
           F.PPH NOMINAL_PPH,
           CASE 
            WHEN C.WAPU = 'Y' THEN F.NOMINAL_DPP ELSE (F.NOMINAL_DPP + F.PPN_TARIF) 
            END 
            AS NOMINAL_INVOICE,
           CASE 
                WHEN A.KD_STATUS = '303' THEN
                'Req. Faktur' 
                WHEN A.KD_STATUS = '302' THEN
                'Rejected' 
                WHEN A.KD_STATUS = '301' THEN
                    'Sent' 
                WHEN A.KD_STATUS = '400' THEN
                    'Invoice' 
                WHEN A.KD_STATUS = '401' THEN
                    'Paid' 
                WHEN A.KD_STATUS = '402' THEN
                    'PYMAD' 
                WHEN A.KD_STATUS = '403' THEN
                    'Completed' 
                ELSE '-' END                         
            AS STATUS,
           CASE
            WHEN F.STATUS_PYMAD = 'T' THEN F.NOMINAL_PYMAD 
            WHEN F.STATUS_INVOICE = 'T' THEN F.NOMINAL_INVOICE 
               ELSE a.REAL_BILLING END               AS NOMINAL,
           CASE
               WHEN F.STATUS_PELUNASAN = 'T' THEN to_char(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY')
               WHEN F.STATUS_INVOICE = 'T' THEN to_char(F.TANGGAL_INVOICE, 'DD/MM/YYYY')
               ELSE '-' END                          AS TANGGAL,
           G.URAIAN                                  AS "URAIAN_STATUS",
           E.LATEST_DATE_STATUS,
           TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
           -- Menggunakan CTE LAST_STATUS_400 untuk mengambil tanggal status 400 terakhir
           H.LAST_DATE_FORMATTED AS TANGGAL_CREATED_INVOICE,
           TO_CHAR(CASE WHEN F.TANGGAL_POSTING IS NOT NULL THEN F.TANGGAL_POSTING ELSE F.TANGGAL_INVOICE END, 'DD-Mon-YYYY') AS TANGGAL_INVOICE,
           TO_CHAR(LAST_DAY(E.LATEST_DATE_STATUS), 'DD-Mon-YYYY') AS TANGGAL_ACRUE 
    FROM N2N.D_BILLING A
             LEFT JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ID
             LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
             LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
             LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
             LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = COALESCE(F.CUSTOMER_ID_TO_SAP, B.CUSTOMER_ID)
             LEFT JOIN N2N.M_STATUS G
                       ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1')
             -- Join dengan CTE LAST_STATUS_400
             LEFT JOIN LAST_STATUS_400 H ON H.PROJECT_ID = A.BILLING_ID
    WHERE A.FLAG_PARENT IN (1,2) 
    -- Menggunakan LAST_STATUS_400 untuk filter
    AND H.PROJECT_ID IS NOT NULL  -- Hanya yang memiliki status 400
    AND (TO_CHAR(H.LAST_DATE_STATUS_400, 'MM-YYYY') = :month 
         OR H.LAST_DATE_STATUS_400 < TO_DATE('01-' || :month, 'DD-MM-YYYY'))
    AND (SELECT COUNT(dps.PROJECT_ID) FROM D_PROJECT_STATUS dps 
         WHERE dps.KD_STATUS = '401' 
         AND dps.PROJECT_ID = A.BILLING_ID 
         AND dps.DATE_STATUS <= H.LAST_DATE_STATUS_400) = 0  -- Memastikan tidak ada status 401 setelah status 400 terakhir
    ORDER BY C.KODE_AKUN ASC, A.TERMIN ASC;`
// A.KD_STATUS IN (:status) AND (TO_CHAR(E.LATEST_DATE_STATUS, 'MM-YYYY') = :month OR E.LATEST_DATE_STATUS < TO_DATE('01-' || :month, 'DD-MM-YYYY'))
query.getListReportSLAInvoice = `
    WITH P_PERCEPATAN AS (
                          (SELECT A.*
                           FROM D_PROJECT A
                           WHERE A.PROJECT_TYPE_ID = '1'
                             AND A.KD_STATUS IN ('005'))),
         LATEST_STATUS AS (SELECT PROJECT_ID, 
                                  MAX(CASE WHEN KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403') THEN DATE_STATUS END) AS LATEST_DATE_STATUS,
                                  MAX(CASE WHEN KD_STATUS = '402' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_START,
                                  MAX(CASE WHEN KD_STATUS = '403' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_KD_END,
                                  MAX(CASE WHEN KD_STATUS = '301' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_SUBMIT_START,
                                  MAX(CASE WHEN KD_STATUS = '400' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_INVOICE_START,
                                  MAX(CASE WHEN KD_STATUS = '401' THEN to_char(DATE_STATUS, 'YYYY-MM-DD') END)  AS SLA_PAID,
                                  MAX(CASE WHEN KD_STATUS = '303' THEN NOTES END) AS KETERANGAN_REQ_FAKTUR,
                                  MAX(CASE WHEN KD_STATUS = '302' THEN NOTES END) AS KETERANGAN_REJECT,
                                  MAX(CASE
                                          WHEN INSTR(CREATED_BY, '-') > 0 THEN REGEXP_SUBSTR(CREATED_BY, '[^-]+', 1, 2)
                                          ELSE CREATED_BY
                                      END)                                                                      AS NAMA_DELIVERY 
                           FROM D_PROJECT_STATUS
                           WHERE KD_STATUS IN ('301', '302', '303', '304', '400', '401', '402', '403') 
                           GROUP BY PROJECT_ID),
            LATEST_FLAG_DOK AS (SELECT PROJECT_ID, FLAG_NEW_DOK FROM D_PROJECT_STATUS WHERE KD_STATUS = '402' ORDER BY DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY)
    SELECT A.BILLING_ID,
           A.PROJECT_ID,
           B.PROJECT_NO,
           B.PROJECT_NAME,
           C.CUSTOMER_NAME,
           C.WAPU,
           A.TERMIN,
           A.KD_STATUS,
           D.PORTOFOLIO,
           E.NAMA_DELIVERY,
           A.KETERANGAN,
           A.DESC_TERMIN,
           F.NO_INVOICE,
           TO_CHAR(F.TANGGAL_INVOICE, 'DD/MM/YYYY') TANGGAL_INVOICE,
           F.NOMINAL_DPP,
           F.PPN_TARIF,
           (SELECT DD.NO_DOKUMEN FROM D_DOKUMEN DD WHERE DD.PROJECT_ID = A.BILLING_ID AND DD.JNS_DOKUMEN = '04006') AS NO_BAST,
           TO_CHAR(F.TANGGAL_BAST, 'DD/MM/YYYY') AS TANGGAL_BAST,
           (SELECT TO_CHAR(DATE_STATUS, 'DD/MM/YYYY') FROM D_PROJECT_STATUS DPS WHERE DPS.PROJECT_ID = A.BILLING_ID AND DPS.KD_STATUS = '402' ORDER BY DPS.DATE_STATUS DESC FETCH FIRST 1 ROW ONLY) AS TANGGAL_PYMAD,
           (SELECT TO_CHAR(DATE_STATUS, 'DD/MM/YYYY') FROM D_PROJECT_STATUS DPS WHERE DPS.PROJECT_ID = A.BILLING_ID AND DPS.KD_STATUS = '403' ORDER BY DPS.DATE_STATUS DESC FETCH FIRST 1 ROW ONLY) AS TANGGAL_COMPLETED,
           (SELECT TO_CHAR(DATE_STATUS, 'DD/MM/YYYY') FROM D_PROJECT_STATUS DPS WHERE DPS.PROJECT_ID = A.BILLING_ID AND DPS.KD_STATUS = '301' ORDER BY DPS.DATE_STATUS DESC FETCH FIRST 1 ROW ONLY) AS TANGGAL_SUBMIT,
           (SELECT TO_CHAR(DATE_STATUS, 'DD/MM/YYYY') FROM D_PROJECT_STATUS DPS WHERE DPS.PROJECT_ID = A.BILLING_ID AND DPS.KD_STATUS = '400' ORDER BY DPS.DATE_STATUS DESC FETCH FIRST 1 ROW ONLY) AS TANGGAL_TERBIT_INVOICE,
           F.NO_FAKTUR,
           TO_CHAR(F.TANGGAL_FAKTUR, 'DD/MM/YYYY') TANGGAL_FAKTUR,
           (SELECT TO_CHAR(DATE_STATUS, 'DD/MM/YYYY') FROM D_PROJECT_STATUS DPS WHERE DPS.PROJECT_ID = A.BILLING_ID AND DPS.KD_STATUS = '400' ORDER BY DPS.DATE_STATUS DESC FETCH FIRST 1 ROW ONLY) AS TANGGAL_PELUNASAN,
           F.PPH,
           F.NOMINAL_PELUNASAN,
           CASE 
                WHEN A.KD_STATUS = '400' THEN
                    'Invoice' 
                WHEN A.KD_STATUS = '401' THEN
                    'Paid' 
                WHEN A.KD_STATUS = '402' THEN
                    'PYMAD' 
                WHEN A.KD_STATUS = '403' THEN
                    'Completed' 
                ELSE '-' END                         
            AS STATUS, 
           CASE
               WHEN F.STATUS_PELUNASAN = 'T' THEN F.NOMINAL_PELUNASAN
               WHEN F.STATUS_INVOICE = 'T' THEN F.NOMINAL_INVOICE
               ELSE a.REAL_BILLING END               AS NOMINAL,
           CASE
               WHEN F.STATUS_PELUNASAN = 'T' THEN to_char(F.TANGGAL_PELUNASAN, 'DD/MM/YYYY')
               WHEN F.STATUS_INVOICE = 'T' THEN to_char(F.TANGGAL_INVOICE, 'DD/MM/YYYY')
               ELSE '-' END                          AS TANGGAL,
           CONCAT(to_char(b.MARGIN_PRESENTASE), '%') AS "MARGIN_PRESENTASE",
           G.URAIAN                                  AS "URAIAN_STATUS",
           E.LATEST_DATE_STATUS,
           TO_CHAR(E.LATEST_DATE_STATUS, 'DD/MM/YYYY HH24:MI:SS') AS TANGGAL_STATUS,
           E.SLA_KD_START                              AS "SLA0_START",
           E.SLA_KD_END                              AS "SLA0_END",
           E.SLA_SUBMIT_START                              AS "SLA1_START",
           E.SLA_INVOICE_START                              AS "SLA1_END",
           E.SLA_INVOICE_START                              AS "SLA2_START",
           E.SLA_PAID                                AS "SLA2_END",
           E.KETERANGAN_REJECT,
           E.KETERANGAN_REQ_FAKTUR 
    FROM N2N.D_BILLING A
             JOIN P_PERCEPATAN B ON B.PROJECT_ID = A.PROJECT_ID
             LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = B.PORTOFOLIO_ID
             LEFT JOIN LATEST_STATUS E ON E.PROJECT_ID = A.BILLING_ID
             LEFT JOIN N2N.D_BILLING_REVENUE F ON F.BILLING_ID = A.BILLING_ID
             LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = COALESCE(F.CUSTOMER_ID_TO_SAP, B.CUSTOMER_ID)
             LEFT JOIN N2N.M_STATUS G
                       ON G.KD_STATUS = A.KD_STATUS AND (G.ID_TAB_STATUS = 'FN1' OR G.ID_TAB_STATUS = 'DL1') 
            LEFT JOIN LATEST_FLAG_DOK H ON H.PROJECT_ID = A.BILLING_ID 
    WHERE A.FLAG_PARENT = 1 AND A.KD_STATUS IN ('400', '401', '402', '403') AND (SELECT TO_CHAR(DPS.DATE_STATUS, 'MM-YYYY') FROM D_PROJECT_STATUS DPS WHERE DPS.KD_STATUS = '400' AND DPS.PROJECT_ID = A.BILLING_ID ORDER BY DPS.DATE_STATUS DESC FETCH FIRST 1 ROW ONLY) = :month;
    `;


query.getListReportBillingRevenue = `
WITH D_STATUS_BILLING AS (SELECT A.PROJECT_ID,
                           A.DATE_STATUS,
                           TO_CHAR(LAST_DAY(c.DATE_STATUS), 'DD-Mon-YYYY') AS TGL_ACRUE,
                        ABS(TRUNC(LAST_DAY(SYSDATE)) - TRUNC(LAST_DAY(DATE_STATUS))) AS UMUR_PYMAD, 
                    FROM D_PROJECT_STATUS A)
SELECT A.BILLING_ID,
       C.PROJECT_NO,
       C.PROJECT_NAME,
       D.CUSTOMER_NAME,
       A.TERMIN,
       A.DESC_TERMIN,
       E.PORTOFOLIO,
       A.EST_BILLING,
       A.REAL_BILLING,
       B.TGL_ACRUE
FROM D_BILLING A
         JOIN D_STATUS_BILLING B ON B.PROJECT_ID = A.BILLING_ID AND A.KD_STATUS = B.KD_STATUS 
         LEFT JOIN D_PROJECT C ON C.PROJECT_ID = A.PROJECT_ID 
         JOIN M_CUSTOMER D ON D.CUSTOMER_ID = C.CUSTOMER_ID
         JOIN M_PORTOFOLIO E ON E.PORTOFOLIO_ID = C.PORTOFOLIO_ID 
ORDER BY B.DATE_STATUS DESC;`

query.getSettingDok = `SELECT
	a.*,
	(
	SELECT
		JSON_ARRAYAGG(
            JSON_OBJECT('LEVEL_APPROVAL' VALUE b.LEVEL_APPROVAL,
                        'NO_URUT' VALUE b.NO_URUT,
                        'NIP' VALUE b.NIPP,
                        'KODE_JABATAN' VALUE b.KODE_JABATAN,
                        'NAMA_PEGAWAI' VALUE b.NAMA_PEGAWAI,
                        'NAMA_JABATAN' VALUE b.NAMA_JABATAN)
                         RETURNING CLOB)
	FROM
		M_SETTING_DOK_D b
	WHERE
		b.SETTING_DOK_ID = a.SETTING_DOK_ID
		AND b.LEVEL_APPROVAL = 'PEMARAF') PEMARAF,
	(SELECT
		JSON_ARRAYAGG(
            JSON_OBJECT('LEVEL_APPROVAL' VALUE b.LEVEL_APPROVAL,
                        'NO_URUT' VALUE b.NO_URUT,
                        'NIP' VALUE b.NIPP,
                        'KODE_JABATAN' VALUE b.KODE_JABATAN,
                        'NAMA_PEGAWAI' VALUE b.NAMA_PEGAWAI,
                        'NAMA_JABATAN' VALUE b.NAMA_JABATAN)
                         RETURNING CLOB)
	FROM
		M_SETTING_DOK_D b
	WHERE
		b.SETTING_DOK_ID = a.SETTING_DOK_ID
		AND b.LEVEL_APPROVAL = 'PENANDATANGAN') PENANDATANGAN 
FROM
	M_SETTING_DOK a
WHERE
	FLAG_AKTIF = 'T'
	AND JENIS_DOK = :jenis_dok`;

query.getDetailBillingRevenueByNoRef = `SELECT a.DOKUMEN_ID, b.BILLING_ID, (SELECT TRIM(dps.CREATED_BY) FROM D_PROJECT_STATUS dps WHERE dps.PROJECT_ID = b.BILLING_ID AND dps.KD_STATUS = '405' ORDER BY dps.DATE_STATUS DESC FETCH FIRST 1 ROWS ONLY) AS NIP_TUJUAN, c.BILLING_CODE FROM N2N.D_DOKUMEN a JOIN N2N.D_BILLING_DOKUMEN b ON a.DOKUMEN_ID = b.DOKUMEN_ID JOIN D_BILLING c ON c.BILLING_ID = b.BILLING_ID WHERE a.NO_REF = ':no_ref'`;

query.getListDokumen = `
SELECT 
    a.DOKUMEN_ID,
    a.NO_DOKUMEN, 
    a.TGL_DOKUMEN,
    a.URL_DOKUMEN,
    a.NOTES,
    a.VALUE_DOK,
    a.FLAG_URL,
    a.JSON_DOK,
    a.FLAG_DELETE,
    a.NO_REF,
    a.CREATED_AT,
    a.CREATED_BY
FROM
    N2N.D_DOKUMEN a
WHERE
    a.JNS_DOKUMEN = :jns_dok AND a.TIPE_DOKUMEN = :tipe_dok;`

query.getListBillingAdjustment = `
    SELECT 
        ROW_NUMBER() OVER (ORDER BY a.CREATED_AT :order) AS row_number,
        a.ADJUSTMENT_ID,
        a.BILLING_ID,
        a.BILLING_CODE,
        a.CUSTOMER_ID,
        a.REAL_PERIODE_BILLING,
        a.REAL_BULAN_BILLING,
        a.REAL_BILLING,
        a.KD_STATUS,
        m1.URAIAN AS UR_KD_STATUS,
        a.JNS_ADJUST,
        a.KETERANGAN,
        a.PROJECT_ID,
        c.CUSTOMER_NAME,
        p.PROJECT_NO,
        CASE WHEN a.PROJECT_ID IS NOT NULL THEN p.PROJECT_NAME 
        ELSE a.PROJECT_NAME END AS PROJECT_NAME 
    FROM N2N.D_BILLING_ADJUSTMENT a JOIN N2N.M_CUSTOMER c ON c.CUSTOMER_ID = a.CUSTOMER_ID 
        LEFT JOIN N2N.D_PROJECT p ON p.PROJECT_ID = a.PROJECT_ID LEFT JOIN M_STATUS m1 ON m1.KD_STATUS = a.KD_STATUS 
    WHERE 
        (upper(c.CUSTOMER_NAME) like upper(:keyword)
        OR upper(a.PROJECT_NAME) like upper(:keyword)
        OR upper(p.PROJECT_NAME) like upper(:keyword)
        OR upper(p.PROJECT_NO) like upper(:keyword)
        OR upper(a.KETERANGAN) like upper(:keyword))
    ORDER BY a.CREATED_AT :order
    OFFSET (:page - 1) * :limit ROWS -- Calculate offset
    FETCH NEXT :limit ROWS ONLY;`

query.countListBillingAdjustment = `
    SELECT
       count(a.BILLING_ID) AS "total_data",
       :page AS "total_halaman",
       :limit AS "limit"
    FROM n2n.D_BILLING_ADJUSTMENT a`;

query.getDetailBillingAdjustment = `
SELECT
    a.ADJUSTMENT_ID,
    a.BILLING_ID,
    a.BILLING_CODE,
    a.REAL_PERIODE_BILLING,
    a.REAL_BULAN_BILLING,
    a.REAL_BILLING,
    a.KD_STATUS,
    a.JNS_ADJUST,
    a.KETERANGAN,
    a.BILLING_ID,
    c.CUSTOMER_ID, 
    c.CUSTOMER_NAME,
    m.URAIAN AS UR_KD_STATUS,
    p.PROJECT_ID,
    p.PROJECT_NO,
    CASE WHEN a.PROJECT_ID IS NOT NULL THEN (p.PROJECT_NO || ' - ' || p.PROJECT_NAME) 
        ELSE NULL END AS PROJECT_UR, 
    CASE WHEN a.PROJECT_ID IS NOT NULL THEN p.PROJECT_NAME 
        ELSE a.PROJECT_NAME END AS PROJECT_NAME 
FROM D_BILLING_ADJUSTMENT a JOIN M_CUSTOMER c ON c.CUSTOMER_ID = a.CUSTOMER_ID 
    LEFT JOIN M_STATUS m ON m.KD_STATUS = a.KD_STATUS 
    LEFT JOIN D_PROJECT p ON p.PROJECT_ID = a.PROJECT_ID 
WHERE
    a.ADJUSTMENT_ID = :adjustment_id`

query.getBillingDokumenFaktur = `
SELECT C.BILLING_ID,
       C.BILLING_CODE,
       A.JNS_DOKUMEN,
       D.UR_REF AS UR_DOKUMEN,
       A.NO_DOKUMEN,
       TO_CHAR(A.TGL_DOKUMEN,'DD/MM/YYYY') AS TGL_DOKUMEN,
       A.URL_DOKUMEN     
FROM D_DOKUMEN A
JOIN D_BILLING_DOKUMEN B ON B.DOKUMEN_ID = A.DOKUMEN_ID
JOIN D_BILLING C ON C.BILLING_ID = B.BILLING_ID
JOIN M_REFERENSI D ON D.KD_REF = A.JNS_DOKUMEN AND D.JNS_REF = 'jenis_dok' AND D.SUB_KD_REF = '01'
WHERE A.JNS_DOKUMEN IN ('01003','01032')
  AND C.BILLING_CODE = ':billingCode';`

query.getLogBillingDocument = `
SELECT 
	a.DOKUMEN_ID,
	a.TIPE_DOKUMEN,
	a.JNS_DOKUMEN,
	c.UR_REF AS URAIAN_JENIS,
	c.UR_REF AS UR_JNS,
	a.NO_DOKUMEN,
	a.TGL_DOKUMEN,
	CASE 
		WHEN a.URL_DOKUMEN IS NOT NULL THEN CONCAT('${LINK_DOK}', a.URL_DOKUMEN)
		ELSE a.URL_DOKUMEN
	END URL_DOKUMEN,
	a.NOTES,
    a.NAME_PEO,
	a.PROJECT_ID,
    a.CREATED_BY,
    a.UPDATED_BY,
    TO_CHAR(a.CREATED_AT, 'DD/MM/YYYY HH24:MI:SS') AS CREATED_AT,
    TO_CHAR(a.UPDATED_AT, 'DD/MM/YYYY HH24:MI:SS') AS UPDATED_AT 
FROM 
	N2N.D_BILLING_DOKUMEN d INNER JOIN 
	N2N.D_DOKUMEN a ON a.DOKUMEN_ID = d.DOKUMEN_ID 
LEFT JOIN N2N.M_REFERENSI c ON c.KD_REF = a.JNS_DOKUMEN AND c.JNS_REF = 'jenis_dok' 
WHERE 
	d.BILLING_ID = :billing_id AND a.TIPE_DOKUMEN IN ('04') ORDER BY a.CREATED_AT DESC;`

query.getListAllBilling = `
SELECT 
   ROW_NUMBER() OVER (:order) AS row_number,
   a.*,
   a.REAL_PERIODE_BILLING AS TAHUN_REAL,
   a.REAL_BULAN_BILLING AS BULAN_REAL,
   a.EST_PERIODE_BILLING AS TAHUN_EST,
   a.EST_BULAN_BILLING AS BULAN_EST,
   a.EST_BILLING AS NILAI_EST,
   a.REAL_BILLING AS NILAI_REAL,
   b.PROJECT_NO, 
   b.PROJECT_NO_OLD, 
   b.PROJECT_NAME, 
   b.NILAI_KONTRAK,
   mc.CUSTOMER_ID,
   mc.CUSTOMER_NAME,
   dbr.NO_FAKTUR,
   dbr.NOMINAL_INVOICE,
   b.KD_SPUC,
   po.PORTOFOLIO,
   CASE 
        WHEN a.KD_STATUS = '304' THEN
            'Faktur Done' 
        WHEN a.KD_STATUS = '303' THEN
            'Req. Faktur' 
        WHEN a.KD_STATUS = '302' THEN
            'Rejected' 
        WHEN a.KD_STATUS = '301' THEN
            'Sent' 
        WHEN a.KD_STATUS = '400' THEN
            'Invoice' 
        WHEN a.KD_STATUS = '401' THEN
            'Paid' 
        WHEN a.KD_STATUS = '402' THEN
            'PYMAD' 
        WHEN a.KD_STATUS = '403' THEN
            'Completed' 
        WHEN a.KD_STATUS = '405' THEN
            'Surat Tagihan' 
        ELSE '-'
    END AS STATUS_BILLING,
    CASE 
        WHEN a.REAL_BULAN_BILLING IS NULL OR a.REAL_PERIODE_BILLING IS NULL THEN 
        NULL 
    ELSE 
        TO_CHAR(
            TO_DATE(a.REAL_BULAN_BILLING || '-' || a.REAL_PERIODE_BILLING, 'MM-YYYY'),
            'Month YYYY'
        ) END 
    AS PERIODE_REALISASI 
FROM D_BILLING a 
    LEFT JOIN D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID AND b.KD_STATUS in ('005') AND b.PROJECT_TYPE_ID = 1 
    LEFT JOIN D_BILLING_REVENUE dbr ON a.BILLING_ID = dbr.BILLING_ID 
    LEFT JOIN M_REFERENSI m ON m.KD_REF = b.PROJECT_KATEGORI_ID AND m.JNS_REF = 'project_kategori_id'
    LEFT JOIN M_PORTOFOLIO po ON b.PORTOFOLIO_ID = po.PORTOFOLIO_ID 
    LEFT JOIN M_CUSTOMER mc ON mc.CUSTOMER_ID = b.CUSTOMER_ID 
    WHERE a.FLAG_PARENT IN (1,2) :condition 
    :order;`

query.getListBillingLOP = `
    SELECT ROW_NUMBER() OVER (:order_by) AS ROW_NUMBER, A.* , B.*, C.CUSTOMER_NAME, D.PORTOFOLIO, 
    E.PROJECT_NAME AS PR_PROJECT_NAME,
    E.CUSTOMER_ID AS PR_CUSTOMER_ID,
    E.PROJECT_NO AS PR_PROJECT_NO,
    E.COGS AS PR_COGS,
    E.NILAI_KONTRAK AS PR_NILAI_KONTRAK
    FROM A_LOP_DETAIL B
             LEFT JOIN A_LOP A ON A.LOP_ID = B.LOP_ID
             LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = A.CUSTOMER_ID
             LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = A.PORTOFOLIO_ID 
             LEFT JOIN D_PROJECT E ON E.PROJECT_ID = A.PROJECT_ID OR E.PROJECT_NO = A.PROJECT_NO 
             AND E.PROJECT_TYPE_ID = '1' 
    WHERE B.FLAG_DELETE = 'F' :condition :order_by 
    OFFSET (:page - 1) * :limit ROWS -- Calculate offset 
    FETCH NEXT :limit ROWS ONLY;`

query.countListBillingLOP = `
SELECT count(B.LOP_DETAIL_ID) AS "total_data",
   :page AS "total_halaman",
   :limit AS "limit" 
FROM A_LOP_DETAIL B
             LEFT JOIN A_LOP A ON A.LOP_ID = B.LOP_ID
             LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = A.CUSTOMER_ID
             LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = A.PORTOFOLIO_ID 
             JOIN D_PROJECT E ON E.PROJECT_ID = A.PROJECT_ID OR E.PROJECT_NO = A.PROJECT_NO
WHERE B.FLAG_DELETE = 'F' :condition;`

query.getDetailBillingLOP = `
SELECT A.*, B.*, C.*, D.*,  
BIL.BILLING_CODE, 
C.CUSTOMER_NAME AS CUSTOMER_UR, 
D.PORTOFOLIO AS PORTOFOLIO_UR, 
M1.UR_REF AS KD_SPUC_UR,
PR.PROJECT_NAME AS PR_PROJECT_NAME,
PR.CUSTOMER_ID AS PR_CUSTOMER_ID,
PR.PROJECT_NO AS PR_PROJECT_NO,
PR.COGS AS PR_COGS, 
TO_CHAR(TO_DATE(B.TAHUN_EST  || B.BULAN_EST , 'YYYYMM'), 'Mon YYYY', 'NLS_DATE_LANGUAGE=ENGLISH') AS PERIODE_EST,
PR.NILAI_KONTRAK AS PR_NILAI_KONTRAK
    FROM A_LOP A
             INNER JOIN A_LOP_DETAIL B ON A.LOP_ID = B.LOP_ID 
             LEFT JOIN N2N.D_BILLING BIL ON BIL.BILLING_ID = B.BILLING_ID 
             LEFT JOIN N2N.D_PROJECT PR ON PR.PROJECT_ID = BIL.PROJECT_ID OR PR.PROJECT_ID = A.PROJECT_ID OR PR.PROJECT_NO = A.PROJECT_NO
             LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = A.CUSTOMER_ID
             LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = A.PORTOFOLIO_ID 
             LEFT JOIN N2N.M_REFERENSI M1 ON M1.KD_REF = A.KD_SPUC AND M1.JNS_REF = 'kd_spuc' 
WHERE 
    B.LOP_DETAIL_ID = :lop_detail_id`;

query.getListDataLopY = `
    SELECT 
        (
        SELECT SUM(Z.NILAI_EST) FROM A_LOP Y INNER JOIN A_LOP_DETAIL Z ON Y.LOP_ID = Z.LOP_ID WHERE Z.STATUS_LOP = 'Y' AND Z.NILAI_REAL IS NULL AND Y.KD_SPUC = ':kd_spuc' AND Z.TAHUN_EST = ':tahun' AND Z.BULAN_EST = ':bulan'
        ) AS "pl_new", 
        (
        SELECT SUM(Z.NILAI_EST) FROM A_LOP Y INNER JOIN A_LOP_DETAIL Z ON Y.LOP_ID = Z.LOP_ID WHERE Z.STATUS_LOP = 'Y' AND Z.NILAI_REAL IS NULL AND Z.BULAN_EST IS NOT NULL AND Z.TAHUN_EST IS NOT NULL AND Z.TAHUN_EST = ':tahun' AND Y.KD_SPUC = ':kd_spuc' AND TO_NUMBER(TRIM(Z.BULAN_EST)) < TO_NUMBER(TRIM(':bulan'))
        ) AS "pl_co", 
        (
        SELECT SUM(Z.NILAI_EST) FROM A_LOP Y INNER JOIN A_LOP_DETAIL Z ON Y.LOP_ID = Z.LOP_ID WHERE Z.STATUS_LOP = 'Y' AND Z.NILAI_REAL IS NULL AND Y.KD_SPUC = ':kd_spuc' AND Z.TAHUN_EST = ':tahun' AND (Z.BULAN_EST = ':bulan' OR TO_NUMBER(TRIM(Z.BULAN_EST)) < TO_NUMBER(TRIM(':bulan')))
        ) AS "pl_total", 
        (
        SELECT SUM(Z.NILAI_REAL) FROM A_LOP Y INNER JOIN A_LOP_DETAIL Z ON Y.LOP_ID = Z.LOP_ID WHERE Z.STATUS_LOP = 'Y' AND Y.KD_SPUC = ':kd_spuc' AND Z.TAHUN_REAL = ':tahun' AND Z.BULAN_REAL = ':bulan'
        ) AS "rl_revenue", 
        (
        NVL((SELECT SUM(Z.NILAI_REAL) FROM A_LOP Y INNER JOIN A_LOP_DETAIL Z ON Y.LOP_ID = Z.LOP_ID WHERE Z.STATUS_LOP = 'Y' AND Y.KD_SPUC = ':kd_spuc' AND Z.TAHUN_REAL = ':tahun' AND Z.BULAN_REAL = ':bulan'), 0) - NVL((SELECT SUM(Z.NILAI_EST) FROM A_LOP Y INNER JOIN A_LOP_DETAIL Z ON Y.LOP_ID = Z.LOP_ID WHERE Z.STATUS_LOP = 'Y' AND Z.NILAI_REAL IS NULL AND Y.KD_SPUC = ':kd_spuc' AND Z.TAHUN_EST = ':tahun' AND (Z.BULAN_EST = ':bulan' OR TO_NUMBER(TRIM(Z.BULAN_EST)) < TO_NUMBER(TRIM(':bulan')))), 0)
        ) AS "deviasi" 
    FROM DUAL;`

query.getListDataLopN = `
    SELECT 
        (
        SELECT SUM(Z.NILAI_EST) FROM A_LOP Y INNER JOIN A_LOP_DETAIL Z ON Y.LOP_ID = Z.LOP_ID WHERE Z.STATUS_LOP = 'N' AND Z.NILAI_REAL IS NULL AND Y.KD_SPUC = ':kd_spuc' AND Z.TAHUN_EST = ':tahun' AND Z.BULAN_EST = ':bulan'
        ) AS "pl_new", 
        (
        SELECT SUM(Z.NILAI_EST) FROM A_LOP Y INNER JOIN A_LOP_DETAIL Z ON Y.LOP_ID = Z.LOP_ID WHERE Z.STATUS_LOP = 'N' AND Z.NILAI_REAL IS NULL AND Z.BULAN_EST IS NOT NULL AND Z.TAHUN_EST IS NOT NULL AND Z.TAHUN_EST = ':tahun' AND Y.KD_SPUC = ':kd_spuc' AND TO_NUMBER(TRIM(Z.BULAN_EST)) < TO_NUMBER(TRIM(':bulan'))
        ) AS "pl_co", 
        (
        SELECT SUM(Z.NILAI_EST) FROM A_LOP Y INNER JOIN A_LOP_DETAIL Z ON Y.LOP_ID = Z.LOP_ID WHERE Z.STATUS_LOP = 'N' AND Z.NILAI_REAL IS NULL AND Y.KD_SPUC = ':kd_spuc' AND Z.TAHUN_EST = ':tahun' AND (Z.BULAN_EST = ':bulan' OR TO_NUMBER(TRIM(Z.BULAN_EST)) < TO_NUMBER(TRIM(':bulan')))
        ) AS "pl_total", 
        (
        SELECT SUM(Z.NILAI_REAL) FROM A_LOP Y INNER JOIN A_LOP_DETAIL Z ON Y.LOP_ID = Z.LOP_ID WHERE Z.STATUS_LOP = 'N' AND Y.KD_SPUC = ':kd_spuc' AND Z.TAHUN_REAL = ':tahun' AND Z.BULAN_REAL = ':bulan'
        ) AS "rl_revenue", 
        (
        NVL((SELECT SUM(Z.NILAI_REAL) FROM A_LOP Y INNER JOIN A_LOP_DETAIL Z ON Y.LOP_ID = Z.LOP_ID WHERE Z.STATUS_LOP = 'N' AND Y.KD_SPUC = ':kd_spuc' AND Z.TAHUN_REAL = ':tahun' AND Z.BULAN_REAL = ':bulan'), 0) - NVL((SELECT SUM(Z.NILAI_EST) FROM A_LOP Y INNER JOIN A_LOP_DETAIL Z ON Y.LOP_ID = Z.LOP_ID WHERE Z.STATUS_LOP = 'N' AND Z.NILAI_REAL IS NULL AND Y.KD_SPUC = ':kd_spuc' AND Z.TAHUN_EST = ':tahun' AND (Z.BULAN_EST = ':bulan' OR TO_NUMBER(TRIM(Z.BULAN_EST)) < TO_NUMBER(TRIM(':bulan')))), 0)
        ) AS "deviasi" 
    FROM DUAL;`


query.getDetailLOP = `
SELECT c.PROJECT_ID,
       c.PROJECT_NO,
       c.COGS,
       c.NILAI_KONTRAK,
       c.PROJECT_NAME,
       d.CUSTOMER_NAME,
       c.CUSTOMER_ID,
       e.PORTOFOLIO,
       c.PORTOFOLIO_ID,
       f.UR_REF                                         AS KD_SPUC_UR,
       c.KD_SPUC,
       c.PROJECT_ID,
       ROUND((1 - (c.COGS / c.NILAI_KONTRAK)) * 100, 2) AS RP_MARGIN
FROM D_PROJECT c
         LEFT JOIN M_CUSTOMER d ON d.CUSTOMER_ID = c.CUSTOMER_ID
         LEFT JOIN M_PORTOFOLIO e ON e.PORTOFOLIO_ID = c.PORTOFOLIO_ID
         LEFT JOIN M_REFERENSI f ON f.KD_REF = c.KD_SPUC AND f.JNS_REF = 'kd_spuc'
WHERE c.PROJECT_NO = :project_no
  AND c.PROJECT_TYPE_ID = '1';
`
query.getDetailLOPXXX = `
SELECT a.LOP_ID, b.LOP_NO, a.NILAI_PROJECT_EST, a.COGS_PROJECT_EST, a.MARGIN_PROJECT_EST ,c.PROJECT_ID, c.PROJECT_NO, c.COGS, c.NILAI_KONTRAK
,c.PROJECT_NAME
,d.CUSTOMER_NAME
,c.CUSTOMER_ID
,e.PORTOFOLIO 
,c.PORTOFOLIO_ID
,f.UR_REF AS KD_SPUC_UR
,c.KD_SPUC 
,c.PROJECT_ID
,ROUND((1 - (c.COGS / c.NILAI_KONTRAK)) * 100, 2) AS RP_MARGIN
FROM D_LOP a 
LEFT JOIN D_LOP_DETAIL b ON b.LOP_ID = a.LOP_ID 
LEFT JOIN D_PROJECT c ON c.PROJECT_NO = a.PROJECT_NO
LEFT JOIN M_CUSTOMER d ON d.CUSTOMER_ID = c.CUSTOMER_ID
LEFT JOIN M_PORTOFOLIO e ON e.PORTOFOLIO_ID = c.PORTOFOLIO_ID
LEFT JOIN M_REFERENSI f ON f.KD_REF = c.KD_SPUC AND f.JNS_REF = 'kd_spuc'
--LEFT JOIN D_DOKUMEN f ON f.PROJECT_ID = c.PROJECT_ID
WHERE c.PROJECT_NO = :project_no;
`

query.updateStatusPYMAD = `
UPDATE D_BILLING_REVENUE A SET STATUS_PYMAD =
                (
                    SELECT CASE 
                             WHEN TO_CHAR(SYSDATE,'YYYYMM') =
                                  ( TO_CHAR(B.REAL_PERIODE_BILLING)
                                    || LPAD(TO_CHAR(B.REAL_BULAN_BILLING), 2, '0') )
                             THEN 'F'
                             ELSE A.STATUS_PYMAD
                           END
                    FROM D_BILLING B
                    WHERE B.BILLING_ID = A.BILLING_ID
                )
            WHERE A.BILLING_ID = :billing_id;
`
query.getListBillingLOPNew = `
WITH SUM_TOTAL AS (SELECT SUM(B.NILAI_EST) AS TOTAL_NILAI_PROJECT_EST
                   FROM A_LOP_DETAIL B
                            LEFT JOIN D_BILLING_REVENUE C2 ON C2.BILLING_ID = B.BILLING_ID
                            LEFT JOIN D_BILLING C3 ON C3.BILLING_ID = B.BILLING_ID
                   WHERE B.FLAG_DELETE = 'F'
                     AND EXISTS (SELECT 1
                                 FROM A_LOP A
                                          JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = A.CUSTOMER_ID
                                          JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = A.PORTOFOLIO_ID
                                          JOIN D_PROJECT E ON E.PROJECT_NO = A.PROJECT_NO
                                 WHERE 1 = 1 :condition)),
     DPROJECT AS (SELECT A.PROJECT_ID,
                         A.KD_STATUS,
                         A.PROJECT_NAME                                         AS PR_PROJECT_NAME,
                         A.CUSTOMER_ID                                          AS PR_CUSTOMER_ID,
                         A.PROJECT_NO                                           AS PR_PROJECT_NO,
                         A.COGS,
                         A.NILAI_KONTRAK,
                         ROUND((1 - (A.COGS / A.NILAI_KONTRAK)) * 100, 2) / 100 AS RP_MARGIN
                  FROM D_PROJECT A
                  WHERE A.PROJECT_TYPE_ID = '1')
SELECT *
FROM (SELECT ROW_NUMBER() OVER (ORDER BY B.TAHUN_EST DESC, TO_NUMBER(B.BULAN_EST) ASC, TO_NUMBER(SUBSTR(A.LOP_ID, 1, 4)) DESC,
    TO_NUMBER(SUBSTR(A.LOP_ID, 13, 4)) ASC)                                             AS ROW_NUMBER,
             F.TOTAL_NILAI_PROJECT_EST,
             -- Kolom dari A_LOP sesuai DDL
             A.LOP_ID,
             A.JENIS_LOP,
             A.PROJECT_ID,
             A.PROJECT_NO,
             A.PROJECT_NAME,
             A.CUSTOMER_ID,
             A.PORTOFOLIO_ID,
             A.KD_SPUC,
             A.CATEGORY_ID,
             A.NAMA_SALES,
             A.PROJECT_OWNER,
             A.NILAI_PROJECT_EST,
             A.COGS_PROJECT_EST,
             A.MARGIN_PROJECT_EST,
             A.NILAI_REVENUE,
             A.CREATED_BY,
             A.CREATED_DATE,
             A.UPDATED_BY,
             A.UPDATED_DATE,
             A.NILAI_LABA,
             A.NILAI_COGS,
             -- Kolom dari A_LOP_DETAIL sesuai DDL
             B.LOP_DETAIL_ID,
             B.LOP_ID                                                                   AS DETAIL_LOP_ID,
             B.SUBMIT_POTTER,
             B.BILLING_ID,
             B.TERMIN,
             B.BULAN_EST,
             B.TAHUN_EST,
             B.NILAI_EST,
             B.COGS_EST,
             C3.REAL_BULAN_BILLING                                                      AS BULAN_REAL,
             C3.REAL_PERIODE_BILLING                                                    AS TAHUN_REAL,
             C3.REAL_BILLING                                                            AS NILAI_REAL,
             C3.REAL_BILLING - ROUND(C3.REAL_BILLING * E.RP_MARGIN)                     AS COGS_REAL,
             C3.REAL_BILLING - (C3.REAL_BILLING - ROUND(C3.REAL_BILLING * E.RP_MARGIN)) AS LABA_REAL,
             B.STATUS_LOP,
             B.STATUS_BILLING,
             B.FLAG_DELETE                                                              AS DETAIL_FLAG_DELETE,
             B.KETERANGAN,
             B.CREATED_BY                                                               AS DETAIL_CREATED_BY,
             B.CREATED_DATE                                                             AS DETAIL_CREATED_DATE,
             B.UPDATED_BY                                                               AS DETAIL_UPDATED_BY,
             B.UPDATED_DATE                                                             AS DETAIL_UPDATED_DATE,
             -- Kolom dari join lainnya
             C.CUSTOMER_NAME,
             D.PORTOFOLIO,
             E.PR_PROJECT_NAME,
             E.PR_CUSTOMER_ID,
             E.PR_PROJECT_NO,
             E.COGS,
             E.NILAI_KONTRAK,
             B.LABA_EST,
             CASE
                 WHEN E.KD_STATUS IS NOT NULL THEN G.URAIAN
                 END                                                                    AS STATUS_PROJECT,
             CASE
                 WHEN B.BULAN_REAL IS NOT NULL AND B.TAHUN_REAL IS NOT NULL THEN 'YES'
                 ELSE 'NO'
                 END                                                                    AS STATUS_REVENUE,
             C3.BILLING_CODE,
             ROUND(C2.NOMINAL_DPP)                                                      AS NOMINAL_INVOICE,
             ROUND(C2.NOMINAL_DPP) - C3.REAL_BILLING                                    AS DEVIASI
      FROM A_LOP A
               LEFT JOIN A_LOP_DETAIL B
                         ON B.LOP_ID = A.LOP_ID
                             AND B.FLAG_DELETE = 'F'
               LEFT JOIN D_BILLING_REVENUE C2 ON C2.BILLING_ID = B.BILLING_ID
               LEFT JOIN D_BILLING C3 ON C3.BILLING_ID = B.BILLING_ID
               LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = COALESCE(C2.CUSTOMER_ID_TO_SAP, A.CUSTOMER_ID)
               LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = A.PORTOFOLIO_ID
               LEFT JOIN DPROJECT E ON E.PR_PROJECT_NO = A.PROJECT_NO
               CROSS JOIN SUM_TOTAL F
               LEFT JOIN M_STATUS G ON E.KD_STATUS = G.KD_STATUS
               LEFT JOIN D_BILLING H ON H.KD_STATUS = G.KD_STATUS
      WHERE 1 = 1 :condition)
WHERE ROW_NUMBER BETWEEN (:page - 1) * :limit + 1 AND :page * :limit
ORDER BY ROW_NUMBER ASC`;

query.countListBillingLOPNew = `
SELECT 
    COUNT(*) AS "total_data",
    CEIL(COUNT(*) / :limit) AS "total_halaman",
    :limit AS "limit"
FROM (
    SELECT DISTINCT B.LOP_DETAIL_ID
    FROM A_LOP_DETAIL B
    LEFT JOIN A_LOP A ON A.LOP_ID = B.LOP_ID
    LEFT JOIN N2N.M_CUSTOMER C ON C.CUSTOMER_ID = A.CUSTOMER_ID
    LEFT JOIN N2N.M_PORTOFOLIO D ON D.PORTOFOLIO_ID = A.PORTOFOLIO_ID 
    LEFT JOIN D_PROJECT E ON E.PROJECT_NO = A.PROJECT_NO
    LEFT JOIN D_BILLING_REVENUE C2 ON C2.BILLING_ID = B.BILLING_ID
    LEFT JOIN D_BILLING C3 ON C3.BILLING_ID = B.BILLING_ID
    WHERE B.FLAG_DELETE = 'F' :condition
)`;

query.getListBillingHeaderLOP = `
SELECT * FROM (
    SELECT
        ROW_NUMBER() OVER (ORDER BY TO_NUMBER(SUBSTR(A.LOP_ID, 1, 4)) DESC,
         TO_NUMBER(SUBSTR(A.LOP_ID, 13, 4)) ASC) AS ROW_NUMBER,
        A.LOP_ID,
        A.JENIS_LOP,
        A.PROJECT_NO,
        A.PROJECT_NAME,
        C.CUSTOMER_NAME,
        D.PORTOFOLIO,
        A.KD_SPUC,
        E.UR_REF AS KATEGORI,
        A.NAMA_SALES,
        A.PROJECT_OWNER,
        A.NILAI_PROJECT_EST,
        A.COGS_PROJECT_EST,
        A.MARGIN_PROJECT_EST,
        A.NILAI_REVENUE,
        A.NILAI_COGS,
        A.NILAI_LABA
    FROM A_LOP A
    LEFT JOIN D_PROJECT B ON B.PROJECT_NO = A.PROJECT_NO AND B.PROJECT_TYPE_ID = 1
    JOIN M_CUSTOMER C ON C.CUSTOMER_ID = A.CUSTOMER_ID
    JOIN M_PORTOFOLIO D ON D.PORTOFOLIO_ID = A.PORTOFOLIO_ID
    LEFT JOIN M_REFERENSI E ON E.JNS_REF = 'category_id' AND E.KD_REF = A.CATEGORY_ID
    WHERE 1=1 :conditionHeader
) WHERE ROW_NUMBER BETWEEN (:page - 1) * :limit + 1 AND :page * :limit
 ORDER BY ROW_NUMBER ASC`;

query.countListBillingHeaderLOP = `
SELECT 
    COUNT(DISTINCT A.LOP_ID) AS "total_data_header",
    CEIL(COUNT(DISTINCT A.LOP_ID) / :limit) AS "total_halaman_header",
    :limit AS "limit_header"
FROM A_LOP A 
LEFT JOIN D_PROJECT B ON B.PROJECT_NO = A.PROJECT_NO  -- PERBAIKAN: PROJECT_NO bukan PROJECT_ID
JOIN M_CUSTOMER C ON C.CUSTOMER_ID = A.CUSTOMER_ID
JOIN M_PORTOFOLIO D ON D.PORTOFOLIO_ID = A.PORTOFOLIO_ID
LEFT JOIN M_REFERENSI E ON E.JNS_REF = 'category_id' AND E.KD_REF = A.CATEGORY_ID
WHERE 1=1 :conditionHeader`;

query.getListLOPID = `
SELECT DISTINCT A.LOP_ID,
       A.JENIS_LOP,
       B.PROJECT_NO,
       A.PROJECT_NAME,
       C.CUSTOMER_NAME,
       C.CUSTOMER_ID,
       D.PORTOFOLIO,
       D.PORTOFOLIO_ID,
       A.KD_SPUC,
       E.UR_REF AS KATEGORI,
       A.NAMA_SALES,
       A.PROJECT_OWNER,
       A.NILAI_PROJECT_EST,
       A.COGS_PROJECT_EST,
       A.MARGIN_PROJECT_EST,
       A.NILAI_REVENUE,
       A.PROJECT_ID
FROM A_LOP A
LEFT JOIN D_PROJECT B ON B.PROJECT_ID = A.PROJECT_ID OR B.PROJECT_NO = A.PROJECT_NO
JOIN M_CUSTOMER C ON C.CUSTOMER_ID = A.CUSTOMER_ID
JOIN M_PORTOFOLIO D ON D.PORTOFOLIO_ID = A.PORTOFOLIO_ID
LEFT JOIN M_REFERENSI E ON E.JNS_REF = 'category_id' AND E.KD_REF = A.CATEGORY_ID
WHERE 1=1 :conditionHeader
ORDER BY A.LOP_ID ASC;
`

query.getRefLop = `
    SELECT
        a.LOP_ID,
        a.PROJECT_NAME,
        a.PROJECT_OWNER,
        a.PORTOFOLIO_ID,
        a.CATEGORY_ID,
        a.KD_SPUC,
        p.KODE AS PORTOFOLIO_KODE,
        p.PORTOFOLIO AS PORTOFOLIO_NAMA,
        q.KD_REF AS CATEGORY_ID,
        q.UR_REF AS CATEGORY_UR,
        a.CUSTOMER_ID,
        f.CUSTOMER_NAME,
        a.NAMA_SALES
    FROM N2N.A_LOP a
    LEFT JOIN N2N.M_PORTOFOLIO p
        ON a.PORTOFOLIO_ID = p.PORTOFOLIO_ID
    LEFT JOIN N2N.M_REFERENSI q
        ON q.JNS_REF = 'category_id' AND q.KD_REF = a.CATEGORY_ID
    LEFT JOIN N2N.M_CUSTOMER f 
        ON f.CUSTOMER_ID = a.CUSTOMER_ID
    WHERE (a.PROJECT_NO IS NULL OR a.PROJECT_NO like '%Inisiasi%')
    :conditionHeader
    ORDER BY a.LOP_ID ASC;
`

query.getTotalRevenueLop = `
SELECT COALESCE(ROUND(SUM(NILAI_EST), 2), 0)        AS T_REVENUE,
       COALESCE(ROUND(SUM(NILAI_REAL), 2), 0)       AS R_REVENUE,
       COALESCE(ROUND(SUM(NILAI_EST), 2), 0)
           - COALESCE(ROUND(SUM(NILAI_REAL), 2), 0) AS D_REVENUE,
       NVL(
               ROUND(SUM(NILAI_REAL) / NULLIF(SUM(NILAI_EST), 0) * 100, 2),
               0
       )                                            AS C_REVENUE,
       COALESCE(ROUND(SUM(COGS_EST), 2), 0)         AS T_COGS,
       COALESCE(ROUND(SUM(COGS_REAL), 2), 0)        AS R_COGS,
       COALESCE(ROUND(SUM(COGS_EST), 2), 0)
           - COALESCE(ROUND(SUM(COGS_REAL), 2), 0)  AS D_COGS,
       NVL(
               ROUND(SUM(COGS_REAL) / NULLIF(SUM(COGS_EST), 0) * 100, 2),
               0
       )                                            AS C_COGS,
       COALESCE(ROUND(SUM(LABA_EST), 2), 0)         AS T_LABA,
       COALESCE(ROUND(SUM(LABA_REAL), 2), 0)        AS R_LABA,
       COALESCE(ROUND(SUM(LABA_EST), 2), 0)
           - COALESCE(ROUND(SUM(LABA_REAL), 2), 0)  AS D_LABA,
       NVL(
               ROUND(SUM(LABA_REAL) / NULLIF(SUM(LABA_EST), 0) * 100, 2),
               0
       )                                            AS C_LABA
FROM A_LOP_DETAIL
WHERE SUBSTR(LOP_ID, 1, 4) = :targetYear
  AND SUBSTR(LOP_ID, 6, 4) = 'RKAP'
  AND FLAG_DELETE <> 'T'`;

query.getListSummaryLop = `
WITH DPROJECT AS (SELECT A.PROJECT_ID,
                         A.KD_STATUS,
                         A.PROJECT_NAME                                         AS PR_PROJECT_NAME,
                         A.CUSTOMER_ID                                          AS PR_CUSTOMER_ID,
                         A.PROJECT_NO                                           AS PR_PROJECT_NO,
                         A.COGS,
                         A.NILAI_KONTRAK,
                         ROUND((1 - (A.COGS / A.NILAI_KONTRAK)) * 100, 2) / 100 AS RP_MARGIN
                  FROM D_PROJECT A
                  WHERE A.PROJECT_TYPE_ID = '1'),
     BASE AS (SELECT B.KD_SPUC,
                     A.LOP_DETAIL_ID,
                     A.BULAN_EST,
                     A.TAHUN_EST,
                     C.REAL_BULAN_BILLING                                 AS BULAN_REAL,
                     C.REAL_PERIODE_BILLING                               AS TAHUN_REAL,
                     A.STATUS_LOP,
                     A.NILAI_EST,
                     A.COGS_EST,
                     C.REAL_BILLING                                       AS NILAI_REAL,
                     C.REAL_BILLING - ROUND(C.REAL_BILLING * D.RP_MARGIN) AS COGS_REAL
              FROM A_LOP_DETAIL A
                       JOIN A_LOP B ON B.LOP_ID = A.LOP_ID
                       LEFT JOIN D_BILLING C ON C.BILLING_ID = A.BILLING_ID
                       LEFT JOIN DPROJECT D ON D.PROJECT_ID = C.PROJECT_ID
              WHERE A.FLAG_DELETE <> 'T'),
     AGG_P AS (SELECT KD_SPUC,
                      SUM(NILAI_EST) AS T_REVENUE_P,
                      SUM(COGS_EST)  AS T_BEBAN_P
               FROM BASE
               WHERE TAHUN_EST = NVL(CAST(:TAHUN_EST AS NUMBER),
                                     EXTRACT(YEAR FROM SYSDATE))
                 AND (
                   (NVL(:MODE, 'M') = 'M'
                       AND BULAN_EST = NVL(CAST(:BULAN_EST AS NUMBER),
                                           EXTRACT(MONTH FROM SYSDATE)))
                       OR (NVL(:MODE, 'M') = 'Y'
                       AND BULAN_EST BETWEEN 1 AND NVL(CAST(:BULAN_EST AS NUMBER),
                                                       EXTRACT(MONTH FROM SYSDATE)))
                       OR (NVL(:MODE, 'M') = 'A'
                       AND BULAN_EST BETWEEN 1 AND 12)
                   )
               GROUP BY KD_SPUC),
     AGG_R AS (SELECT KD_SPUC,
                      SUM(CASE WHEN STATUS_LOP = 'Y' THEN NILAI_REAL ELSE 0 END) AS T_REVENUE_RY,
                      SUM(CASE WHEN STATUS_LOP = 'Y' THEN COGS_REAL ELSE 0 END)  AS T_BEBAN_RY,
                      SUM(CASE WHEN STATUS_LOP = 'N' THEN NILAI_REAL ELSE 0 END) AS T_REVENUE_RN,
                      SUM(CASE WHEN STATUS_LOP = 'N' THEN COGS_REAL ELSE 0 END)  AS T_BEBAN_RN
               FROM BASE
               WHERE TAHUN_REAL = NVL(CAST(:TAHUN_EST AS NUMBER),
                                      EXTRACT(YEAR FROM SYSDATE))
                 AND (
                   (NVL(:MODE, 'M') = 'M'
                       AND BULAN_REAL = NVL(CAST(:BULAN_EST AS NUMBER),
                                            EXTRACT(MONTH FROM SYSDATE)))
                       OR (NVL(:MODE, 'M') = 'Y'
                       AND BULAN_REAL BETWEEN 1 AND NVL(CAST(:BULAN_EST AS NUMBER),
                                                        EXTRACT(MONTH FROM SYSDATE)))
                       OR (NVL(:MODE, 'M') = 'A'
                       AND BULAN_REAL BETWEEN 1 AND 12)
                   )
               GROUP BY KD_SPUC)
SELECT P.KD_SPUC,
       P.T_REVENUE_P,
       P.T_BEBAN_P,
       ROUND((1 - (P.T_BEBAN_P / NULLIF(P.T_REVENUE_P, 0))) * 100, 2)                                      AS T_MARGIN_P,
       (P.T_REVENUE_P - P.T_BEBAN_P)                                                                       AS T_LABA_P,
       R.T_REVENUE_RY,
       R.T_REVENUE_RN,
       (R.T_REVENUE_RY + R.T_REVENUE_RN)                                                                   AS T_REVENUE_R,
       (R.T_BEBAN_RY + R.T_BEBAN_RN)                                                                       AS T_BEBAN_R,
       ROUND(
               (1 - ((R.T_BEBAN_RY + R.T_BEBAN_RN) /
                     NULLIF((R.T_REVENUE_RY + R.T_REVENUE_RN), 0))) * 100,
               2)                                                                                          AS T_MARGIN_R,
       (R.T_REVENUE_RY + R.T_REVENUE_RN)
           - (R.T_BEBAN_RY + R.T_BEBAN_RN)                                                                 AS T_LABA_R,
       P.T_REVENUE_P - (R.T_REVENUE_RY + R.T_REVENUE_RN)                                                   AS T_REVENUE_D,
       P.T_BEBAN_P - (R.T_BEBAN_RY + R.T_BEBAN_RN)                                                         AS T_BEBAN_D,
       ROUND(
               ((1 - (P.T_BEBAN_P / NULLIF(P.T_REVENUE_P, 0))) * 100)
                   -
               ((1 - ((R.T_BEBAN_RY + R.T_BEBAN_RN) /
                      NULLIF((R.T_REVENUE_RY + R.T_REVENUE_RN), 0))) * 100),
               2)                                                                                          AS T_MARGIN_D,
       (P.T_REVENUE_P - P.T_BEBAN_P) - ((R.T_REVENUE_RY + R.T_REVENUE_RN) - (R.T_BEBAN_RY + R.T_BEBAN_RN)) AS T_LABA_D
FROM AGG_P P
         LEFT JOIN AGG_R R
                   ON P.KD_SPUC = R.KD_SPUC
ORDER BY P.KD_SPUC
`;
query.getListSummaryLopOld = `
WITH BASE AS (
    SELECT B.KD_SPUC,
           A.BULAN_EST,
           A.TAHUN_EST,
           A.STATUS_LOP,
           A.NILAI_EST,
           A.COGS_EST,
           A.NILAI_REAL,
           A.COGS_REAL
    FROM A_LOP_DETAIL A
             JOIN A_LOP B ON B.LOP_ID = A.LOP_ID
),
AGG AS (
    SELECT KD_SPUC,
           TAHUN_EST,
           SUM(NILAI_EST)                                             AS T_REVENUE_P,
           SUM(COGS_EST)                                              AS T_BEBAN_P,
           SUM(CASE WHEN STATUS_LOP = 'Y' THEN NILAI_REAL ELSE 0 END) AS T_REVENUE_RY,
           SUM(CASE WHEN STATUS_LOP = 'Y' THEN COGS_REAL ELSE 0 END)  AS T_BEBAN_RY,
           SUM(CASE WHEN STATUS_LOP = 'N' THEN NILAI_REAL ELSE 0 END) AS T_REVENUE_RN,
           SUM(CASE WHEN STATUS_LOP = 'N' THEN COGS_REAL ELSE 0 END)  AS T_BEBAN_RN
    FROM BASE
    WHERE TAHUN_EST = NVL(
            CAST(:TAHUN_EST AS NUMBER),
            EXTRACT(YEAR FROM SYSDATE)
        )
      AND (
            -- MODE M : bulan & tahun berjalan
            (
                NVL(:MODE, 'M') = 'M'
                AND BULAN_EST = NVL(
                    CAST(:BULAN_EST AS NUMBER),
                    EXTRACT(MONTH FROM SYSDATE)
                )
            )
            OR
            -- MODE Y : Januari s/d bulan yang dipilih
            (
                NVL(:MODE, 'M') = 'Y'
                AND BULAN_EST BETWEEN 1 AND NVL(
                    CAST(:BULAN_EST AS NUMBER),
                    EXTRACT(MONTH FROM SYSDATE)
                )
            )
            OR
            -- MODE A : 1 tahun penuh
            (
                NVL(:MODE, 'M') = 'A'
                AND BULAN_EST BETWEEN 1 AND 12
            )
        )
    GROUP BY KD_SPUC, TAHUN_EST
)
SELECT KD_SPUC,
       T_REVENUE_P,
       T_BEBAN_P,
       ROUND((1 - (T_BEBAN_P / NULLIF(T_REVENUE_P, 0))) * 100, 2) AS T_MARGIN_P,
       (T_REVENUE_P - T_BEBAN_P)                                  AS T_LABA_P,
       T_REVENUE_RY,
       T_REVENUE_RN,
       (T_REVENUE_RY + T_REVENUE_RN)                              AS T_REVENUE_R,
       (T_BEBAN_RY + T_BEBAN_RN)                                  AS T_BEBAN_R,
       ROUND(
               (1 - ((T_BEBAN_RY + T_BEBAN_RN)
                   / NULLIF((T_REVENUE_RY + T_REVENUE_RN), 0))) * 100, 2
       )                                                          AS T_MARGIN_R,
       (T_REVENUE_RY + T_REVENUE_RN)
           - (T_BEBAN_RY + T_BEBAN_RN)                            AS T_LABA_R,
       T_REVENUE_P - (T_REVENUE_RY + T_REVENUE_RN)                AS T_REVENUE_D,
       T_BEBAN_P - (T_BEBAN_RY + T_BEBAN_RN)                      AS T_BEBAN_D,
       ROUND(
               ((1 - (T_BEBAN_P / NULLIF(T_REVENUE_P, 0))) * 100)
                   - ((1 - ((T_BEBAN_RY + T_BEBAN_RN)
                   / NULLIF((T_REVENUE_RY + T_REVENUE_RN), 0))) * 100)
           , 2)                                                   AS T_MARGIN_D,
       (T_REVENUE_P - T_BEBAN_P)
           - ((T_REVENUE_RY + T_REVENUE_RN)
           - (T_BEBAN_RY + T_BEBAN_RN))                           AS T_LABA_D
FROM AGG
ORDER BY KD_SPUC
`;

query.generateNoRef = `
SELECT
    TO_CHAR(SYSDATE, 'YYYYMMDD') ||
    LPAD(
        NVL(
            MAX(TO_NUMBER(SUBSTR(NO_INTEGRASI, 9))), 
            0
        ) + 1,
        3,
        '0'
    ) AS NO_REF_BARU
FROM D_BILLING
WHERE SUBSTR(NO_INTEGRASI, 1, 8) = TO_CHAR(SYSDATE, 'YYYYMMDD');`

query.getDetailByLopIds = `
SELECT
    B.*
FROM A_LOP_DETAIL B
WHERE B.FLAG_DELETE = 'F'
AND B.LOP_ID IN (:lopIds)
`;

query.getListNoProject = `
SELECT A.PROJECT_ID,
       A.PROJECT_NO,
       A.PROJECT_NAME,
       A.KD_SPUC,
       B.LOP_ID,
       CASE WHEN B.LOP_ID IS NOT NULL THEN '1' ELSE '0' END AS FLAG_LOP,
       C.WAPU,
       C.CUSTOMER_ID, 
       C.CUSTOMER_NAME
FROM D_PROJECT A
LEFT JOIN A_LOP B ON B.PROJECT_ID = A.PROJECT_ID OR B.PROJECT_NO = A.PROJECT_NO
LEFT JOIN M_CUSTOMER C ON C.CUSTOMER_ID = A.CUSTOMER_ID 
WHERE A.KD_STATUS IN ('004','005')
:conditionHeader
`;

query.createLOPFromProject = `
INSERT INTO A_LOP (
    LOP_ID,
    JENIS_LOP,
    PROJECT_ID,
    PROJECT_NO,
    PROJECT_NAME,
    CUSTOMER_ID,
    PORTOFOLIO_ID,
    KD_SPUC,
    CATEGORY_ID,
    NAMA_SALES,
    NILAI_PROJECT_EST,
    COGS_PROJECT_EST,
    NILAI_REVENUE,
    STATUS_PROJECT,
    CREATED_BY,
    CREATED_DATE,
    NILAI_LABA,
    NILAI_COGS
)
SELECT 
    :lop_id,
    'RKAP',
    PROJECT_ID,
    PROJECT_NO,
    PROJECT_NAME,
    CUSTOMER_ID,
    PORTOFOLIO_ID,
    KD_SPUC,
    CATEGORY_ID,
    NAMA_SALES,
    NILAI_PENAWARAN,
    EST_COGS,
    NILAI_KONTRAK,
    '',
    'SYSTEM',
    SYSDATE,
    NILAI_KONTRAK - COGS,
    COGS
FROM D_PROJECT
WHERE PROJECT_NO = :paramsProjectNo
`;

query.getProjectByNo = `
    SELECT PROJECT_ID
    FROM D_PROJECT
    WHERE PROJECT_NO = :paramsProjectNo
`;

query.updateProjectLOP = `
    UPDATE D_PROJECT
    SET LOP_ID = :lop_id,
        FLAG_LOP = 'F'
    WHERE PROJECT_ID = :project_id
`;

query.updateRevenueLopDetail = `
    UPDATE N2N.A_LOP_DETAIL
    SET
        TERMIN          = :TERMIN,
        STATUS_BILLING  = :STATUS_BILLING,
        BULAN_REAL      = :BULAN_REAL,
        TAHUN_REAL      = :TAHUN_REAL,
        NILAI_REAL      = :NILAI_REAL,
        STATUS_LOP      = :STATUS_LOP,
        BILLING_ID      = :BILLING_ID,
        KETERANGAN      = :KETERANGAN,
        SUBMIT_POTTER   = :SUBMIT_POTTER,
        COGS_REAL       = :COGS_REAL,
        LABA_REAL       = :LABA_REAL,
        UPDATED_DATE    = CURRENT_TIMESTAMP
    WHERE LOP_DETAIL_ID = :LOP_DETAIL_ID
`;

query.getListBillingFakturPajak = `
WITH DOKUMEN_CTE AS (SELECT VDL.BILLING_ID,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '08001'
                                        THEN REGEXP_REPLACE(VDL.NO_DOKUMEN, '\s+', '') END) AS NO_SURAT_TAGIHAN,
                            NVL(
                                    MAX(CASE WHEN VDL.JNS_DOKUMEN = '08001' THEN VDL.TGL_DOKUMEN END),
                                    SYSDATE
                            )                                                               AS TANGGAL_SURAT_TAGIHAN,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '01003'
                                        THEN REGEXP_REPLACE(VDL.NO_DOKUMEN, '\s+', '') END) AS NO_FAKTUR_AWAL,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '01003'
                                        THEN VDL.TGL_DOKUMEN END)                           AS TGL_FAKTUR_AWAL,
                            COALESCE(
                                    MAX(CASE
                                            WHEN VDL.JNS_DOKUMEN = '04006'
                                                THEN REGEXP_REPLACE(VDL.NO_DOKUMEN, '\s+', '')
                                        END),
                                    MAX(CASE
                                            WHEN VDL.JNS_DOKUMEN = '04009'
                                                THEN REGEXP_REPLACE(VDL.NO_DOKUMEN, '\s+', '')
                                        END)
                            )                                                               AS NO_BAST,
                            COALESCE(
                                    MAX(CASE
                                            WHEN VDL.JNS_DOKUMEN = '04006'
                                                THEN VDL.TGL_DOKUMEN
                                        END),
                                    MAX(CASE
                                            WHEN VDL.JNS_DOKUMEN = '04009'
                                                THEN VDL.TGL_DOKUMEN
                                        END)
                            )                                                               AS TGL_BAST,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '01004'
                                        THEN REGEXP_REPLACE(VDL.NO_DOKUMEN, '\s+', '') END) AS NO_INVOICE,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '01004'
                                        THEN VDL.TGL_DOKUMEN END)                           AS TGL_INVOICE
                     FROM V_DOKUMEN_LATEST VDL
                     WHERE VDL.JNS_DOKUMEN IN ('08001', '01003', '04006', '04009', '01004')
                     GROUP BY VDL.BILLING_ID),
     DATA AS (SELECT A.BILLING_ID,
                     TO_CHAR(TO_DATE(:month || '-' || :year, 'MM-YYYY'), 'MON-YY') AS PERIODE_PAJAK,
                     A.BILLING_CODE,
                     C.PROJECT_NAME                                                AS NAMA_PROJECT,
                     CU.CUSTOMER_NAME                                              AS NAMA_CUSTOMER,
                     C.KD_SPUC                                                     AS SPUC,
                     C.PORTOFOLIO_ID,
                     E.PORTOFOLIO,
                     C.PROJECT_NO                                                  AS PID,
                     DOK.NO_INVOICE,
                     B.NOMINAL_DPP                                                 AS NILAI_DPP,
                     B.PPN_TARIF                                                   AS NILAI_PPN,
                     B.NOMINAL_INVOICE                                             AS NILAI_TAGIHAN,
                     DOK.NO_SURAT_TAGIHAN,
                     CASE
                         WHEN CU.WAPU = 'Y' THEN 'YES'
                         ELSE 'NO'
                         END                                                       AS WAPU,
                     I.URAIAN                                                      AS STATUS_BILLING,
                     DOK.NO_FAKTUR_AWAL,
                     TO_CHAR(DOK.TGL_BAST, 'YYYY/MM/DD')                           AS TANGGAL_BAST,
                     TO_CHAR(DOK.TGL_FAKTUR_AWAL, 'YYYY/MM/DD')                    AS TGL_FAKTUR_AWAL,
                     TO_CHAR(DOK.TGL_INVOICE, 'YYYY/MM/DD')                        AS TGL_INVOICE,
                     TO_CHAR(DOK.TANGGAL_SURAT_TAGIHAN, 'YYYY/MM/DD')              AS TANGGAL_SURAT_TAGIHAN,
                     CASE
                         WHEN TRUNC(DOK.TGL_FAKTUR_AWAL) > TRUNC(COALESCE(DOK.TGL_BAST, DOK.TGL_INVOICE))
                             THEN ROUND((B.NOMINAL_DPP * 0.01), 0)
                         ELSE 0
                         END                                                       AS KPFP,
                     CASE
                         WHEN CU.WAPU = 'Y' THEN
                             CASE
                                 WHEN TRUNC(DOK.TANGGAL_SURAT_TAGIHAN) >
                                      (TRUNC(DOK.TGL_FAKTUR_AWAL, 'MM') + INTERVAL '1' MONTH + 14)
                                     THEN ROUND(B.PPN_TARIF * 0.02)
                                 ELSE 0
                                 END
                         ELSE 0
                         END                                                       AS KSW,
                     CASE
                         WHEN EXTRACT(YEAR FROM DOK.TGL_FAKTUR_AWAL) <>
                              EXTRACT(YEAR FROM DOK.TGL_BAST)
                             THEN ROUND(B.NOMINAL_DPP * 0.22)
                         ELSE 0
                         END                                                       AS KBT,
                     CASE
                         WHEN MONTHS_BETWEEN(DOK.TANGGAL_SURAT_TAGIHAN, DOK.TGL_FAKTUR_AWAL) > 4
                             THEN ROUND(B.PPN_TARIF)
                         ELSE 0
                         END                                                       AS FPTDD
              FROM D_BILLING A
                       JOIN D_BILLING_REVENUE B ON B.BILLING_ID = A.BILLING_ID
                       JOIN D_PROJECT C ON C.PROJECT_ID = A.PROJECT_ID
                       JOIN M_CUSTOMER CU ON CU.CUSTOMER_ID = C.CUSTOMER_ID
                       JOIN M_PORTOFOLIO E ON E.PORTOFOLIO_ID = C.PORTOFOLIO_ID
                       JOIN M_STATUS I ON I.KD_STATUS = A.KD_STATUS
                       LEFT JOIN DOKUMEN_CTE DOK ON DOK.BILLING_ID = A.BILLING_ID
              WHERE TO_CHAR(DOK.TGL_FAKTUR_AWAL, 'YYYY') = :year
                AND TO_CHAR(DOK.TGL_FAKTUR_AWAL, 'MM') = :month
                AND A.KD_STATUS NOT IN ('406')
              ORDER BY A.BILLING_CODE ASC)
SELECT X.*,
       (X.KPFP + X.KSW + X.KBT + X.FPTDD) AS TOTAL_POTENSI_DENDA_PAJAK
FROM DATA X
`;
query.getListBillingFakturPajakOld = `
WITH DOKUMEN_CTE AS (SELECT VDL.BILLING_ID,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '08001'
                                        THEN REGEXP_REPLACE(VDL.NO_DOKUMEN, '\s+', '') END) AS NO_SURAT_TAGIHAN,
                            NVL(
                                    MAX(CASE WHEN VDL.JNS_DOKUMEN = '08001' THEN VDL.TGL_DOKUMEN END),
                                    SYSDATE
                            )                                                               AS TANGGAL_SURAT_TAGIHAN,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '01003'
                                        THEN REGEXP_REPLACE(VDL.NO_DOKUMEN, '\s+', '') END) AS NO_FAKTUR_AWAL,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '01003'
                                        THEN VDL.TGL_DOKUMEN END)                           AS TGL_FAKTUR_AWAL,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '04006'
                                        THEN REGEXP_REPLACE(VDL.NO_DOKUMEN, '\s+', '') END) AS NO_BAST,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '04006'
                                        THEN VDL.TGL_DOKUMEN END)                           AS TGL_BAST,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '04009'
                                        THEN REGEXP_REPLACE(VDL.NO_DOKUMEN, '\s+', '') END) AS NO_BAST_DRAFT,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '04009'
                                        THEN VDL.TGL_DOKUMEN END)                           AS TGL_BAST_DRAFT,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '01004'
                                        THEN REGEXP_REPLACE(VDL.NO_DOKUMEN, '\s+', '') END) AS NO_INVOICE,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '01004'
                                        THEN VDL.TGL_DOKUMEN END)                           AS TGL_INVOICE
                     FROM V_DOKUMEN_LATEST VDL
                     WHERE VDL.JNS_DOKUMEN IN ('08001', '01003', '04006', '04009', '01004')
                     GROUP BY VDL.BILLING_ID),
     DATA AS (SELECT A.BILLING_ID,
                     TO_CHAR(TO_DATE(:month || '-' || :year, 'MM-YYYY'), 'MON-YY')     AS PERIODE_PAJAK,
                     A.BILLING_CODE,
                     C.PROJECT_NAME                                                    AS NAMA_PROJECT,
                     CU.CUSTOMER_NAME                                                  AS NAMA_CUSTOMER,
                     C.KD_SPUC                                                         AS SPUC,
                     C.PORTOFOLIO_ID,
                     E.PORTOFOLIO,
                     C.PROJECT_NO                                                      AS PID,
                     DOK.NO_INVOICE,
                     B.NOMINAL_DPP                                                     AS NILAI_DPP,
                     B.PPN_TARIF                                                       AS NILAI_PPN,
                     B.NOMINAL_INVOICE                                                 AS NILAI_TAGIHAN,
                     DOK.NO_SURAT_TAGIHAN,
                     CASE
                         WHEN CU.WAPU = 'Y' THEN 'YES'
                         ELSE 'NO'
                         END                                                           AS WAPU,
                     I.URAIAN                                                          AS STATUS_BILLING,
                     DOK.NO_FAKTUR_AWAL,
                     TO_CHAR(COALESCE(DOK.TGL_BAST, DOK.TGL_BAST_DRAFT), 'YYYY/MM/DD') AS TANGGAL_BAST,
                     TO_CHAR(DOK.TGL_FAKTUR_AWAL, 'YYYY/MM/DD')                        AS TGL_FAKTUR_AWAL,
                     TO_CHAR(DOK.TGL_INVOICE, 'YYYY/MM/DD')                            AS TGL_INVOICE,
                     TO_CHAR(DOK.TANGGAL_SURAT_TAGIHAN, 'YYYY/MM/DD')                  AS TANGGAL_SURAT_TAGIHAN,
                     CASE
                         WHEN DOK.TGL_FAKTUR_AWAL > COALESCE(DOK.TGL_BAST, DOK.TGL_INVOICE)
                             THEN ROUND((B.NOMINAL_DPP * 0.01), 0)
                         ELSE 0
                         END                                                           AS KPFP,
                     CASE
                         WHEN CU.WAPU = 'YES' THEN
                             CASE
                                 WHEN DOK.TANGGAL_SURAT_TAGIHAN >
                                      (TRUNC(DOK.TGL_FAKTUR_AWAL, 'MM') + INTERVAL '1' MONTH + 14)
                                     THEN B.PPN_TARIF * 0.02
                                 ELSE 0
                                 END
                         ELSE 0
                         END                                                           AS KSW,
                     CASE
                         WHEN EXTRACT(YEAR FROM DOK.TGL_FAKTUR_AWAL) <>
                              EXTRACT(YEAR FROM COALESCE(DOK.TGL_BAST, DOK.TGL_BAST_DRAFT))
                             THEN B.NOMINAL_DPP * 0.22
                         ELSE 0
                         END                                                           AS KBT,
                     CASE
                         WHEN MONTHS_BETWEEN(DOK.TANGGAL_SURAT_TAGIHAN, DOK.TGL_FAKTUR_AWAL) > 3
                             THEN B.NOMINAL_DPP
                         ELSE 0
                         END                                                           AS FPTDD
              FROM D_BILLING A
                       JOIN D_BILLING_REVENUE B ON B.BILLING_ID = A.BILLING_ID
                       JOIN D_PROJECT C ON C.PROJECT_ID = A.PROJECT_ID
                       JOIN M_CUSTOMER CU ON CU.CUSTOMER_ID = C.CUSTOMER_ID
                       JOIN M_PORTOFOLIO E ON E.PORTOFOLIO_ID = C.PORTOFOLIO_ID
                       JOIN M_STATUS I ON I.KD_STATUS = A.KD_STATUS
                       LEFT JOIN DOKUMEN_CTE DOK ON DOK.BILLING_ID = A.BILLING_ID
              WHERE TO_CHAR(DOK.TGL_FAKTUR_AWAL, 'YYYY') = :year
                AND TO_CHAR(DOK.TGL_FAKTUR_AWAL, 'MM') = :month
              ORDER BY A.BILLING_CODE ASC)
SELECT X.*,
       (X.KPFP + X.KSW + X.KBT + X.FPTDD) AS TOTAL_POTENSI_DENDA_PAJAK
FROM DATA X
`;

query.getListNoFakturExcel = `
WITH PROJECT AS (
SELECT
	A.PROJECT_ID,
	A.PROJECT_NO,
	A.PROJECT_NAME,
	B.CUSTOMER_NAME,
	A.KD_SPUC,
	B.WAPU,
	B.TRADING_PARTNER,
	C.PORTOFOLIO
FROM
	D_PROJECT A
JOIN M_CUSTOMER B ON
	B.CUSTOMER_ID = A.CUSTOMER_ID
JOIN M_PORTOFOLIO C ON
	C.PORTOFOLIO_ID = A.PORTOFOLIO_ID
WHERE
	A.KD_STATUS = '005'
	AND A.PROJECT_TYPE_ID = '1'),
     COA_RULES AS (
SELECT
	'PYMAD' AS COA_TYPE,
	MAX(CASE WHEN VR.PRIORITY = 1 AND VR.ITEM_NO_ACCOUNT = '40' THEN VR.COA_CODE END) AS COA_40,
	MAX(CASE WHEN VR.PRIORITY = 1 AND VR.ITEM_NO_ACCOUNT = '50' THEN VR.COA_CODE END) AS COA_50,
	MAX(CASE WHEN VR.PRIORITY = 2 AND VR.ITEM_NO_ACCOUNT = '40' THEN VR.COA_CODE END) AS COA
FROM
	V_COA_RULE_RESOLVE VR
WHERE
	VR.JURNAL_CREATE_ID = 2
	AND VR.ITEM_TEXT = 'PYMAD'
UNION ALL
SELECT
	'PPN' AS COA_TYPE,
	MAX(CASE WHEN VR.PRIORITY = 1 AND VR.ITEM_NO_ACCOUNT = '40' THEN VR.COA_CODE END) AS COA_40,
	MAX(CASE WHEN VR.PRIORITY = 1 AND VR.ITEM_NO_ACCOUNT = '50' THEN VR.COA_CODE END) AS COA_50,
	MAX(CASE WHEN VR.PRIORITY = 2 AND VR.ITEM_NO_ACCOUNT = '50' THEN VR.COA_CODE END) AS COA
FROM
	V_COA_RULE_RESOLVE VR
WHERE
	VR.JURNAL_CREATE_ID = 2
	AND VR.ITEM_TEXT = 'PPN'),
     BILLING_DATA AS (
SELECT
	A.BILLING_ID,
	A.BILLING_CODE,
	'7100' AS COMP_CODE,
	TO_CHAR(LAST_DAY(TO_DATE(:YEAR || '-' || :MONTH || '-01', 'YYYY-MM-DD')),
                                     'DD.MM.YYYY') AS LAST_DAY_MONTH,
	:MONTH AS JURNAL_PERIODE,
	'SA' AS DOCUMENT_TYPE,
	'' AS LEDGER,
	A.BILLING_CODE AS REFERENCE_DOCUMENT,
	'IDR' AS CURRENCY,
	'' AS REF_KEY,
	ROUND((A.REAL_BILLING * 11) / 100) AS AMOUNT_PPN,
	C.PROJECT_NO,
	C.PROJECT_NAME,
	'71001' AS PROFIT_CENTER,
	COALESCE(C.WAPU, 'N') AS WAPU,
	COALESCE((SELECT KD_REF FROM M_REFERENSI WHERE JNS_REF = 'jurnal_trading_partner'),
                                      C.TRADING_PARTNER) AS TRADING_PARTNER,
	(
	SELECT
		COA_40
	FROM
		COA_RULES
	WHERE
		COA_TYPE = 'PYMAD') AS COA_PYMAD_40,
	(
	SELECT
		COA_50
	FROM
		COA_RULES
	WHERE
		COA_TYPE = 'PYMAD') AS COA_PYMAD_50,
	(
	SELECT
		COA_40
	FROM
		COA_RULES
	WHERE
		COA_TYPE = 'PPN') AS COA_PPN_40,
	(
	SELECT
		COA_50
	FROM
		COA_RULES
	WHERE
		COA_TYPE = 'PPN') AS COA_PPN_50,
	(
	SELECT
		COA
	FROM
		COA_RULES
	WHERE
		COA_TYPE = 'PYMAD') AS COA_PYMAD,
	(
	SELECT
		COA
	FROM
		COA_RULES
	WHERE
		COA_TYPE = 'PPN') AS COA_PPN
FROM
	D_BILLING A
JOIN D_BILLING_REVENUE B ON
	B.BILLING_ID = A.BILLING_ID
	AND B.FLAG_FAKTUR = 'Y'
JOIN PROJECT C ON
	C.PROJECT_ID = A.PROJECT_ID
JOIN M_STATUS D ON
	D.KD_STATUS = A.KD_STATUS
WHERE
	A.FLAG_PARENT IN (1, 2)
		AND A.KD_STATUS NOT IN ('302')
			AND EXISTS(SELECT 1
                                   FROM M_STATUS_MAPPING MSM
                                   WHERE MSM.KD_STATUS = A.KD_STATUS
                                     AND MSM.FUNCTION_CODE = 'JURNAL_PPN')
			AND A.KD_STATUS IS NOT NULL :billingCondition :periode :status :wajib_faktur :divisi :keyword :dokumen)
SELECT
	ROW_NUMBER() OVER (
	ORDER BY HEADER_TEXT,
	ITEM_NO) AS NO,
	X.*
FROM
	(
	SELECT
		WAPU,
		BILLING_CODE AS HEADER_TEXT,
		COMP_CODE,
		LAST_DAY_MONTH AS DOCUMENT_DATE,
		LAST_DAY_MONTH AS POSTING_DATE,
		JURNAL_PERIODE AS PERIOD,
		DOCUMENT_TYPE,
		LEDGER,
		REFERENCE_DOCUMENT,
		CURRENCY,
		REF_KEY AS REF_KEY_HEADER1,
		ITEM_NO,
		GL_ACCOUNT,
		POSTING_KEY,
		'' AS SPECIAL_GL_IND,
		AMOUNT,
		AMOUNT AS AMOUNT_LOCAL,
		'' AS BUSINESS_AREA,
		'' AS TAX_CODE,
		PROJECT_NO AS ASSIGNMENT,
		PROFIT_CENTER,
		PROJECT_NAME AS ITEM_TEXT,
		LAST_DAY_MONTH AS VALUE_DATE,
		LAST_DAY_MONTH AS BASELINE_DATE,
		'' AS WBS_ELEMENT,
		'' AS COST_CENTER,
		'' AS ORDER_NO,
		'' AS PAYMENT_TERM,
		'' AS PAYMENT_METHOD,
		'' AS PARTNER_BANK,
		'' AS HOUSE_BANK,
		'' AS BANK_ID,
		'' AS INVOICE_REFERENCE,
		'' AS EXCHANGE_RATE,
		TRADING_PARTNER
	FROM
		(
		SELECT
			BD.*,
			1 AS ITEM_NO,
			BD.COA_PYMAD_40 AS GL_ACCOUNT,
			'40' AS POSTING_KEY,
			BD.AMOUNT_PPN AS AMOUNT
		FROM
			BILLING_DATA BD
		WHERE
			BD.WAPU = 'Y'
	UNION ALL
		SELECT
			BD.*,
			2,
			BD.COA_PPN_50,
			'50',
			BD.AMOUNT_PPN
		FROM
			BILLING_DATA BD
		WHERE
			BD.WAPU = 'Y'
	UNION ALL
		SELECT
			BD.*,
			3,
			BD.COA_PYMAD_50,
			'50',
			BD.AMOUNT_PPN
		FROM
			BILLING_DATA BD
		WHERE
			BD.WAPU = 'Y'
	UNION ALL
		SELECT
			BD.*,
			4,
			BD.COA_PPN_40,
			'40',
			BD.AMOUNT_PPN
		FROM
			BILLING_DATA BD
		WHERE
			BD.WAPU = 'Y'
	UNION ALL
		SELECT
			BD.*,
			1,
			BD.COA_PYMAD,
			'40',
			BD.AMOUNT_PPN
		FROM
			BILLING_DATA BD
		WHERE
			BD.WAPU = 'T'
	UNION ALL
		SELECT
			BD.*,
			2,
			BD.COA_PPN,
			'50',
			BD.AMOUNT_PPN
		FROM
			BILLING_DATA BD
		WHERE
			BD.WAPU = 'T') JURNAL_ITEMS) X
ORDER BY
	HEADER_TEXT,
	ITEM_NO
`;

query.getListBillingCode = `
SELECT A.BILLING_CODE,
       CASE 
           WHEN B.REV_SHARING = 'Y' THEN VR_PEND_KSO.COA_CODE
           ELSE VR_PEND.COA_CODE
       END AS COA_CODE,
       CASE 
           WHEN B.REV_SHARING = 'Y' THEN VR_PEND_KSO.COA_NAME
           ELSE VR_PEND.COA_NAME
       END AS COA_NAME
FROM D_BILLING A
JOIN D_PROJECT B 
     ON B.PROJECT_ID = A.PROJECT_ID
LEFT JOIN V_COA_RULE_RESOLVE VR_PEND_KSO
       ON VR_PEND_KSO.JURNAL_CREATE_ID = 1
       AND VR_PEND_KSO.ITEM_TEXT = 'PENDAPATAN'
       AND VR_PEND_KSO.PARAM_TYPE = 'REV_SHARING'
       AND VR_PEND_KSO.PARAM_VALUE = B.REV_SHARING
LEFT JOIN V_COA_RULE_RESOLVE VR_PEND
       ON VR_PEND.JURNAL_CREATE_ID = 1
       AND VR_PEND.ITEM_TEXT = 'PENDAPATAN'
       AND VR_PEND.PORTOFOLIO_ID = B.PORTOFOLIO_ID
WHERE 1=1
:condition
`;

query.getSummaryDendaFakturPajak = `
WITH DOKUMEN_CTE AS (SELECT VDL.BILLING_ID,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '08001'
                                        THEN REGEXP_REPLACE(VDL.NO_DOKUMEN, '\s+', '') END) AS NO_SURAT_TAGIHAN,
                            NVL(
                                    MAX(CASE WHEN VDL.JNS_DOKUMEN = '08001' THEN VDL.TGL_DOKUMEN END),
                                    SYSDATE
                            )                                                               AS TANGGAL_SURAT_TAGIHAN,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '01003'
                                        THEN REGEXP_REPLACE(VDL.NO_DOKUMEN, '\s+', '') END) AS NO_FAKTUR_AWAL,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '01003'
                                        THEN VDL.TGL_DOKUMEN END)                           AS TGL_FAKTUR_AWAL,
                            COALESCE(
                                    MAX(CASE
                                            WHEN VDL.JNS_DOKUMEN = '04006'
                                                THEN REGEXP_REPLACE(VDL.NO_DOKUMEN, '\s+', '')
                                        END),
                                    MAX(CASE
                                            WHEN VDL.JNS_DOKUMEN = '04009'
                                                THEN REGEXP_REPLACE(VDL.NO_DOKUMEN, '\s+', '')
                                        END)
                            )                                                               AS NO_BAST,
                            COALESCE(
                                    MAX(CASE
                                            WHEN VDL.JNS_DOKUMEN = '04006'
                                                THEN VDL.TGL_DOKUMEN
                                        END),
                                    MAX(CASE
                                            WHEN VDL.JNS_DOKUMEN = '04009'
                                                THEN VDL.TGL_DOKUMEN
                                        END)
                            )                                                               AS TGL_BAST,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '01004'
                                        THEN REGEXP_REPLACE(VDL.NO_DOKUMEN, '\s+', '') END) AS NO_INVOICE,
                            MAX(CASE
                                    WHEN VDL.JNS_DOKUMEN = '01004'
                                        THEN VDL.TGL_DOKUMEN END)                           AS TGL_INVOICE
                     FROM V_DOKUMEN_LATEST VDL
                     WHERE VDL.JNS_DOKUMEN IN ('08001', '01003', '04006', '04009', '01004')
                     GROUP BY VDL.BILLING_ID)
SELECT C.KD_SPUC AS SPUC,
       ROUND(SUM(
               CASE
                   WHEN EXTRACT(YEAR FROM DOK.TGL_FAKTUR_AWAL) = :year
                       AND EXTRACT(MONTH FROM DOK.TGL_FAKTUR_AWAL) = :month
                       THEN
                       (
                           (CASE
                                WHEN TRUNC(DOK.TGL_FAKTUR_AWAL) > TRUNC(COALESCE(DOK.TGL_BAST, DOK.TGL_INVOICE))
                                    THEN ROUND((B.NOMINAL_DPP * 0.01), 0)
                                ELSE 0
                               END)
                               +
                           (CASE
                                WHEN CU.WAPU = 'Y'
                                    AND TRUNC(DOK.TANGGAL_SURAT_TAGIHAN) >
                                        (TRUNC(DOK.TGL_FAKTUR_AWAL, 'MM') + INTERVAL '1' MONTH + 14)
                                    THEN B.PPN_TARIF * 0.02
                                ELSE 0
                               END)
                               +
                           (CASE
                                WHEN EXTRACT(YEAR FROM DOK.TGL_FAKTUR_AWAL) <>
                                     EXTRACT(YEAR FROM DOK.TGL_BAST)
                                    THEN B.NOMINAL_DPP * 0.22
                                ELSE 0
                               END)
                               +
                           (CASE
                                WHEN MONTHS_BETWEEN(DOK.TANGGAL_SURAT_TAGIHAN, DOK.TGL_FAKTUR_AWAL) > 4
                                    THEN ROUND(B.PPN_TARIF)
                                ELSE 0
                               END)
                           )
                   ELSE 0
                   END
             ))  AS TOTAL_DENDA_MONTHLY,
       ROUND(SUM(
               CASE
                   WHEN EXTRACT(YEAR FROM DOK.TGL_FAKTUR_AWAL) = :year
                       AND EXTRACT(MONTH FROM DOK.TGL_FAKTUR_AWAL) <= :month
                       THEN
                       (
                           (CASE
                                WHEN TRUNC(DOK.TGL_FAKTUR_AWAL) > TRUNC(COALESCE(DOK.TGL_BAST, DOK.TGL_INVOICE))
                                    THEN ROUND((B.NOMINAL_DPP * 0.01), 0)
                                ELSE 0
                               END)
                               +
                           (CASE
                                WHEN CU.WAPU = 'Y'
                                    AND TRUNC(DOK.TANGGAL_SURAT_TAGIHAN) >
                                        (TRUNC(DOK.TGL_FAKTUR_AWAL, 'MM') + INTERVAL '1' MONTH + 14)
                                    THEN B.PPN_TARIF * 0.02
                                ELSE 0
                               END)
                               +
                           (CASE
                                WHEN EXTRACT(YEAR FROM DOK.TGL_FAKTUR_AWAL) <>
                                     EXTRACT(YEAR FROM DOK.TGL_BAST)
                                    THEN B.NOMINAL_DPP * 0.22
                                ELSE 0
                               END)
                               +
                           (CASE
                                WHEN MONTHS_BETWEEN(DOK.TANGGAL_SURAT_TAGIHAN, DOK.TGL_FAKTUR_AWAL) > 4
                                    THEN ROUND(B.PPN_TARIF)
                                ELSE 0
                               END)
                           )
                   ELSE 0
                   END
             ))  AS TOTAL_DENDA_YTD
FROM D_BILLING A
         JOIN D_BILLING_REVENUE B ON B.BILLING_ID = A.BILLING_ID
         JOIN D_PROJECT C ON C.PROJECT_ID = A.PROJECT_ID
         JOIN M_CUSTOMER CU ON CU.CUSTOMER_ID = C.CUSTOMER_ID
         LEFT JOIN DOKUMEN_CTE DOK ON DOK.BILLING_ID = A.BILLING_ID
WHERE C.KD_SPUC IS NOT NULL
  AND A.KD_STATUS NOT IN ('406')
GROUP BY C.KD_SPUC;
`;

query.getListAllBillingForLop = `
SELECT 
   ROW_NUMBER() OVER (:order) AS row_number,
   a.*,
   a.REAL_PERIODE_BILLING AS TAHUN_REAL,
   a.REAL_BULAN_BILLING AS BULAN_REAL,
   a.EST_PERIODE_BILLING AS TAHUN_EST,
   a.EST_BULAN_BILLING AS BULAN_EST,
   a.EST_BILLING AS NILAI_EST,
   a.REAL_BILLING AS NILAI_REAL,
   b.PROJECT_NO, 
   b.PROJECT_NO_OLD, 
   b.PROJECT_NAME, 
   b.NILAI_KONTRAK,
   mc.CUSTOMER_ID,
   mc.CUSTOMER_NAME,
   dbr.NO_FAKTUR,
   dbr.NOMINAL_INVOICE,
   b.KD_SPUC,
   po.PORTOFOLIO,
   CASE 
        WHEN a.KD_STATUS = '304' THEN
            'Faktur Done' 
        WHEN a.KD_STATUS = '303' THEN
            'Req. Faktur' 
        WHEN a.KD_STATUS = '302' THEN
            'Rejected' 
        WHEN a.KD_STATUS = '301' THEN
            'Sent' 
        WHEN a.KD_STATUS = '400' THEN
            'Invoice' 
        WHEN a.KD_STATUS = '401' THEN
            'Paid' 
        WHEN a.KD_STATUS = '402' THEN
            'PYMAD' 
        WHEN a.KD_STATUS = '403' THEN
            'Completed' 
        WHEN a.KD_STATUS = '405' THEN
            'Surat Tagihan' 
        ELSE '-'
    END AS STATUS_BILLING,
    CASE 
        WHEN a.REAL_BULAN_BILLING IS NULL OR a.REAL_PERIODE_BILLING IS NULL THEN 
        NULL 
    ELSE 
        TO_CHAR(
            TO_DATE(a.REAL_BULAN_BILLING || '-' || a.REAL_PERIODE_BILLING, 'MM-YYYY'),
            'Month YYYY'
        ) END 
    AS PERIODE_REALISASI 
FROM D_BILLING a 
    LEFT JOIN D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID AND b.KD_STATUS in ('005') AND b.PROJECT_TYPE_ID = 1 
    LEFT JOIN D_BILLING_REVENUE dbr ON a.BILLING_ID = dbr.BILLING_ID 
    LEFT JOIN M_REFERENSI m ON m.KD_REF = b.PROJECT_KATEGORI_ID AND m.JNS_REF = 'project_kategori_id'
    LEFT JOIN M_PORTOFOLIO po ON b.PORTOFOLIO_ID = po.PORTOFOLIO_ID 
    LEFT JOIN M_CUSTOMER mc ON mc.CUSTOMER_ID = b.CUSTOMER_ID 
    WHERE a.FLAG_PARENT IN (1,2) AND NOT EXISTS (SELECT 1 FROM A_LOP_DETAIL X WHERE X.BILLING_ID = A.BILLING_ID) :condition 
    :order;`

query.getBillingChild = `
SELECT 
	a.BILLING_ID,
	a.PROJECT_ID,
    a.BILLING_CODE,
    a.DIVISI_ID,
    a.TERMIN,
    a.DESC_TERMIN,
    a.KETERANGAN,
    a.EST_BILLING,
    a.REAL_BILLING,
    (a.EST_PERIODE_BILLING || '-' || a.EST_BULAN_BILLING) AS EST_PERIODE_BILLING,
    (a.REAL_PERIODE_BILLING || '-' || a.REAL_BULAN_BILLING) AS REAL_PERIODE_BILLING,
    a.CREATED_BY,
    a.KD_STATUS,
    a.FLAG_PARENT,
    a.PARENT_ID  
FROM 
    N2N.D_BILLING a 
WHERE 
	a.PARENT_ID = :billing_id ORDER BY TO_NUMBER(a.TERMIN) ASC;`

query.getBillingChildOpt = `
SELECT 
	a.BILLING_ID,
	a.PROJECT_ID,
    a.BILLING_CODE,
    a.DIVISI_ID,
    a.TERMIN,
    a.DESC_TERMIN,
    a.KETERANGAN,
    a.EST_BILLING,
    a.REAL_BILLING,
    (a.EST_PERIODE_BILLING || '-' || a.EST_BULAN_BILLING) AS EST_PERIODE_BILLING,
    (a.REAL_PERIODE_BILLING || '-' || a.REAL_BULAN_BILLING) AS REAL_PERIODE_BILLING,
    a.CREATED_BY,
    a.KD_STATUS,
    a.FLAG_PARENT,
    a.PARENT_ID  
FROM 
    N2N.D_BILLING a LEFT JOIN N2N.D_PROJECT b ON b.PROJECT_ID = a.PROJECT_ID
WHERE 
	a.PROJECT_ID = :project_id AND a.FLAG_PARENT = 0 AND a.PARENT_ID IS NULL ORDER BY TO_NUMBER(a.TERMIN) ASC;`

// YANG DIPAKAI

// query.getSummaryPengajuan = `
// WITH last_status AS (
//     SELECT *
//     FROM (
//         SELECT distinct
//             pengajuan_id,
//             status_verifikasi,
//             kd_status,
//             ROW_NUMBER() OVER (
//                 PARTITION BY pengajuan_id
//                 ORDER BY no_urut DESC
//             ) AS rn
//         FROM d_status_pengajuan where flag_show = 'Y'
//     ) x
//     WHERE rn = 1
// ),
// show_pengajuan AS (
// select s.pengajuan_id, s.role_id, s.flag_action, s.status_verifikasi, s.kd_status, s.no_urut, s.view_only, s.unit_kerja_id, s.jabatan_id 
// from d_status_pengajuan s where s.flag_show IN ('Y', 'N')
// )
// SELECT
//     (
//         SELECT 
//             COUNT(distinct a.pengajuan_id) 
//         FROM d_pengajuan a left join last_status b 
//             on a.pengajuan_id = b.pengajuan_id 
//             left join m_role_user mru on mru.role_user_id = a.role_pemohon_id 
//             -- left join show_pengajuan shp on shp.pengajuan_id = a.pengajuan_id 
//             -- left join m_role_user mrx on mrx.role_id = shp.role_id and mrx.unit_kerja_id = shp.unit_kerja_id 
//             -- and mrx.jabatan_id = shp.jabatan_id 
//         WHERE 
//             a.flag_aktif = 'Y' and (select count(spp.status_id) from d_status_pengajuan spp 
// where spp.pengajuan_id = a.pengajuan_id :condRole) > 0 :condition
//     ) AS total_pengajuan,
//     (
//         SELECT 
//             COUNT(distinct a.pengajuan_id) 
//         FROM d_pengajuan a left join last_status b 
//             on a.pengajuan_id = b.pengajuan_id 
//             left join m_role_user mru on mru.role_user_id = a.role_pemohon_id 
//             left join show_pengajuan shp on shp.pengajuan_id = a.pengajuan_id 
//             -- left join m_role_user mrx on mrx.role_id = shp.role_id and mrx.unit_kerja_id = shp.unit_kerja_id 
//             -- and mrx.jabatan_id = shp.jabatan_id 
//         WHERE 
//             a.flag_aktif = 'Y' and (select count(spp.status_id) from d_status_pengajuan spp 
// where spp.pengajuan_id = a.pengajuan_id and (spp.status_verifikasi is null or spp.status_verifikasi = '') and (spp.kd_status is null or spp.kd_status = '' or spp.kd_status = 'P') :condRole) > 0 :condition
//     ) AS pending_verifikasi,
//     (
//         SELECT 
//             COUNT(distinct a.pengajuan_id) 
//         FROM d_pengajuan a left join last_status b 
//             on a.pengajuan_id = b.pengajuan_id 
//             left join m_role_user mru on mru.role_user_id = a.role_pemohon_id left join show_pengajuan shp on shp.pengajuan_id = a.pengajuan_id 
//             -- left join m_role_user mrx on mrx.role_id = shp.role_id and mrx.unit_kerja_id = shp.unit_kerja_id 
//             -- and mrx.jabatan_id = shp.jabatan_id 
//         WHERE 
//             a.flag_aktif = 'Y' and (select count(spp.status_id) from d_status_pengajuan spp 
// where spp.pengajuan_id = a.pengajuan_id and spp.status_verifikasi = 'Y' and (spp.kd_status is null or spp.kd_status = '' or spp.kd_status = 'P' or spp.kd_status = 'VR' or spp.kd_status = 'UR') :condRole) > 0 :condition
//     ) AS sudah_verifikasi,
//     (
//         SELECT 
//             COUNT(distinct a.pengajuan_id) 
//         FROM d_pengajuan a left join last_status b 
//             on a.pengajuan_id = b.pengajuan_id 
//             left join m_role_user mru on mru.role_user_id = a.role_pemohon_id 
//             left join show_pengajuan shp on shp.pengajuan_id = a.pengajuan_id 
//             -- left join m_role_user mrx on mrx.role_id = shp.role_id and mrx.unit_kerja_id = shp.unit_kerja_id 
//             -- and mrx.jabatan_id = shp.jabatan_id 
//         WHERE 
//             a.flag_aktif = 'Y' and (select count(spp.status_id) from d_status_pengajuan spp 
// where spp.pengajuan_id = a.pengajuan_id and spp.kd_status in ('S1','S2') :condRole) > 0 :condition
//     ) AS sudah_approve,
//     (
//         SELECT 
//             COUNT(distinct a.pengajuan_id) 
//         FROM d_pengajuan a left join last_status b 
//             on a.pengajuan_id = b.pengajuan_id 
//             left join m_role_user mru on mru.role_user_id = a.role_pemohon_id 
//             -- left join show_pengajuan shp on shp.pengajuan_id = a.pengajuan_id 
//             -- left join m_role_user mrx on mrx.role_id = shp.role_id and mrx.unit_kerja_id = shp.unit_kerja_id 
//             -- and mrx.jabatan_id = shp.jabatan_id 
//         WHERE 
//             a.flag_aktif = 'Y' and (select count(spp.status_id) from d_status_pengajuan spp 
// where spp.pengajuan_id = a.pengajuan_id and spp.kd_status in ('T') :condRole) > 0 :condition
//     ) AS ditolak,
//     (
//         SELECT 
//             COUNT(distinct a.pengajuan_id) 
//         FROM d_pengajuan a left join last_status b 
//             on a.pengajuan_id = b.pengajuan_id 
//             left join m_role_user mru on mru.role_user_id = a.role_pemohon_id 
//             -- left join show_pengajuan shp on shp.pengajuan_id = a.pengajuan_id 
//             -- left join m_role_user mrx on mrx.role_id = shp.role_id and mrx.unit_kerja_id = shp.unit_kerja_id 
//             -- and mrx.jabatan_id = shp.jabatan_id 
//         WHERE 
//             a.flag_aktif = 'Y' AND (select count(spp.status_id) from d_status_pengajuan spp 
// where spp.pengajuan_id = a.pengajuan_id and spp.kd_status in ('T') :condRole) > 0 :condition
//     ) AS dibatalkan;
// `
query.getSummaryPengajuan = `
WITH last_status AS (
    SELECT *
    FROM (
        SELECT
            pengajuan_id,
            status_verifikasi,
            kd_status,
            ROW_NUMBER() OVER (
                PARTITION BY pengajuan_id
                ORDER BY no_urut DESC
            ) rn
        FROM d_status_pengajuan
        WHERE flag_show = 'Y'
    )
    WHERE rn = 1
),
show_pengajuan AS (
    SELECT
        pengajuan_id,
        role_id,
        flag_action,
        status_verifikasi,
        kd_status,
        no_urut,
        view_only,
        unit_kerja_id,
        jabatan_id
    FROM d_status_pengajuan
    WHERE flag_show IN ('Y','T')
),
summary_status AS (
    SELECT
        a.pengajuan_id,
        /* Ada workflow sesuai role */
        MAX(CASE
                WHEN 1 = 1 :condRole
                THEN 1
                ELSE 0
            END) ada_role,
        /* Pending Verifikasi */
        MAX(CASE
                WHEN spp.jenis_user_id != '1' :condRole
                 AND (spp.kd_status IS NULL or spp.kd_status = '') 
                THEN 1
                ELSE 0
            END) pending_verifikasi,
        /* Pending Verifikasi User */
        MAX(CASE
                WHEN spp.flag_action = 'Y' AND (spp.kd_status IS NULL or spp.kd_status = '') :condUser 
                THEN 1
                ELSE 0
            END) pending_verifikasi_user,
        /* Sudah Verifikasi */
        MAX(
            CASE
                WHEN spp.jenis_user_id = '1' :condRole 
                 AND (
                        NOT EXISTS (
                            SELECT 1
                            FROM d_status_pengajuan x
                            WHERE x.pengajuan_id = spp.pengajuan_id
                              AND x.unit_kerja_id = spp.unit_kerja_id 
                              AND x.role_id != 'RL01'
                              AND x.jenis_user_id != '1'
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM d_status_pengajuan x
                            WHERE x.pengajuan_id = spp.pengajuan_id
                              AND x.unit_kerja_id = spp.unit_kerja_id
                              AND x.jenis_user_id != '1'
                              AND x.kd_status IN ('VR','UR')
                        )
                     ) AND (spp.kd_status IS NULL or spp.kd_status = '') 
                THEN 1
                ELSE 0
            END
        ) sudah_verifikasi,
        /* Sudah Verifikasi User*/
        MAX(
            CASE
                WHEN spp.flag_action = 'Y' AND (spp.kd_status IS NULL or spp.kd_status = '') :condUser 
                 AND (
                        NOT EXISTS (
                            SELECT 1
                            FROM d_status_pengajuan x
                            WHERE x.pengajuan_id = spp.pengajuan_id
                              AND x.unit_kerja_id = spp.unit_kerja_id 
                              AND x.role_id != 'RL01'
                              AND x.jenis_user_id != '1'
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM d_status_pengajuan x
                            WHERE x.pengajuan_id = spp.pengajuan_id
                              AND x.unit_kerja_id = spp.unit_kerja_id
                              AND x.jenis_user_id != '1'
                              AND x.kd_status IN ('VR','UR')
                        )
                     ) AND (spp.kd_status IS NULL or spp.kd_status = '') 
                THEN 1
                ELSE 0
            END
        ) sudah_verifikasi_user,
        MAX(CASE
                WHEN spp.jenis_user_id = '1' 
                    AND spp.role_id != 'RL01' 
                    AND spp.view_only = 'T'
                    AND spp.kd_status IN ('S1','S2') :condRole
                THEN 1
                ELSE 0
            END) sudah_approve,
        MAX(CASE
                WHEN spp.kd_status = 'T' :condRole
                THEN 1
                ELSE 0
            END) ditolak
    FROM d_pengajuan a
    JOIN d_status_pengajuan spp
        ON spp.pengajuan_id = a.pengajuan_id
    WHERE a.flag_aktif='Y'
    GROUP BY a.pengajuan_id
),
base AS (
    SELECT
        a.pengajuan_id,
        ss.pending_verifikasi,
        ss.pending_verifikasi_user,
        ss.sudah_verifikasi,
        ss.sudah_verifikasi_user,
        ss.sudah_approve,
        ss.ditolak
    FROM d_pengajuan a
    LEFT JOIN last_status b
        ON b.pengajuan_id=a.pengajuan_id
    LEFT JOIN m_role_user mru
        ON mru.role_user_id=a.role_pemohon_id
    LEFT JOIN summary_status ss
        ON ss.pengajuan_id=a.pengajuan_id
    WHERE a.flag_aktif='Y'
      AND ss.ada_role=1
      :condition
)
SELECT
    COUNT(*) total_pengajuan,
    COALESCE(SUM(CASE
            WHEN pending_verifikasi=1
            THEN 1
            ELSE 0
        END), 0) pending_verifikasi,
    COALESCE(SUM(CASE
            WHEN pending_verifikasi_user=1
            THEN 1
            ELSE 0
        END), 0) pending_verifikasi_user,
    COALESCE(SUM(CASE
            WHEN sudah_verifikasi=1
            THEN 1
            ELSE 0
        END), 0) sudah_verifikasi,
    COALESCE(SUM(CASE
            WHEN sudah_verifikasi_user=1
            THEN 1
            ELSE 0
        END), 0) sudah_verifikasi_user,
    COALESCE(SUM(CASE
            WHEN sudah_approve=1
            THEN 1
            ELSE 0
        END), 0) sudah_approve,
    COALESCE(SUM(CASE
            WHEN ditolak=1
            THEN 1
            ELSE 0
        END), 0) ditolak,
    COALESCE(SUM(CASE
            WHEN ditolak=1
            THEN 1
            ELSE 0
        END), 0) dibatalkan
FROM base;
`

// query.getListPengajuan = `
// WITH status_pengajuan AS (
// SELECT *
//     FROM (
//         SELECT
//             s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.status_verifikasi, s.unit_kerja_id, s.jabatan_id, s.flag_action, 
//             s.view_only,  
//             ROW_NUMBER() OVER (
//                 PARTITION BY s.pengajuan_id
//                 ORDER BY s.date_status DESC
//             ) AS rn
//         FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' 
//         WHERE s.flag_show = 'Y' AND s.view_only = 'T' order by s.date_status DESC
//     ) x
//     WHERE rn = 1
// ),
// -- show_pengajuan AS (
// -- select s.pengajuan_id, s.role_id, s.flag_action, s.status_verifikasi, s.kd_status, s.no_urut, s.view_only, s.unit_kerja_id, s.jabatan_id 
// -- from d_status_pengajuan s where s.flag_show IN ('Y', 'T')
// -- :cte
// -- ),
// status_aktif AS (
// SELECT *
//     FROM (
// select s.pengajuan_id, s.kd_status, s.flag_action, s.flag_show, s.status_verifikasi, s.view_only, s.unit_kerja_id, ROW_NUMBER() OVER (
//                 PARTITION BY s.pengajuan_id
//                 ORDER BY s.no_urut DESC
//             ) AS rn from d_status_pengajuan s where s.no_urut is not null :condJabatanId) x
//     WHERE rn = 1
// ),
// status_history AS (
// SELECT *
//     FROM (
// select s.history_id, z.pengajuan_id, ROW_NUMBER() OVER (
//                 PARTITION BY s.history_id
//                 ORDER BY s.created_at DESC
//             ) AS rn from d_status_pengajuan_history s join d_status_pengajuan z on s.status_id = z.status_id where s.qrcode is not null and s.role_user_id = :role_user order by s.created_at desc) x
//     WHERE rn = 1 LIMIT 1
// )
// SELECT 
//    ROW_NUMBER() OVER (:order_row) AS row_number,
//    a.*,
//    v.nama_vendor,
//    mr1.ur_ref AS jenis_biaya,
//    mr1.sub_kd_ref,
//    mu.nip AS nik_pemohon, 
//    mu.nama AS nama_pemohon,
//    mru.jabatan_id,
//    mr2.ur_ref AS jabatan,
//    mru.cabang_id, 
//    mr3.ur_ref AS cabang,
//    sp.kegiatan AS status_kegiatan,
//    sp.role AS status_unit,
//    sp.role_id AS status_unit_role,
//    sp.status_terbaru AS status_pengajuan,
//    sp.unit_kerja_id AS status_unit_kerja_id,
//    mr4.ur_ref AS status_unit_kerja,
//    sp.jabatan_id AS status_jabatan_id,
//    sp.status_verifikasi,
//    -- sa.wajib_verifikasi AS user_wajib_verifikasi,
//    sa.flag_action AS user_flag_action,
//    sa.kd_status AS user_kd_status,
//    sa.status_verifikasi AS user_status_verifikasi,
//    sa.view_only AS user_view_only,
//    -- sp.flag_action,
//    -- sp.view_only,
//    sp.kd_status,
//    -- shp.status_verifikasi,
//    -- shp.flag_action, 
//    -- shp.view_only,
//    sh.history_id 
// FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
// left join status_history sh on sh.pengajuan_id = a.pengajuan_id 
// left join m_role_user mru ON mru.role_user_id = a.role_pemohon_id
// left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
// left join m_referensi mr2 ON mr2.kd_ref = mru.jabatan_id and mr2.jns_ref = 'jabatan_id' 
// left join m_referensi mr3 ON mr3.kd_ref = mru.cabang_id and mr3.jns_ref = 'cabang_id' 
// left join status_pengajuan sp ON sp.pengajuan_id = a.pengajuan_id 
// left join m_referensi mr4 ON mr4.kd_ref = sp.unit_kerja_id and mr4.jns_ref = 'unit_kerja_id' 
// left join status_aktif sa ON sa.pengajuan_id = a.pengajuan_id 
// -- left join show_pengajuan shp ON shp.pengajuan_id = a.pengajuan_id 
// -- left join m_role_user mrx on mrx.role_id = shp.role_id and mrx.unit_kerja_id = shp.unit_kerja_id 
// -- and mrx.jabatan_id = shp.jabatan_id 
// left join m_vendor v on v.vendor_id = a.vendor_id 
// WHERE a.flag_aktif = 'Y' 
// and (select count(spp.status_id) from d_status_pengajuan spp 
// where spp.pengajuan_id = a.pengajuan_id :condRole) > 0
// :condition :condSearch ORDER BY :order 
// OFFSET (:page - 1) * :limit 
// FETCH NEXT :limit ROWS ONLY;`
query.getListPengajuan = `
WITH status_pengajuan AS (
SELECT *
    FROM (
        SELECT
            s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.unit_kerja_id, s.jabatan_id, s.flag_action, 
            s.view_only, s.jenis_user_id, mr3.ur_ref AS ur_jenis_user_id, s.status_id,
            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn,
            CASE
                            WHEN
                                (
                                    NOT EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                    )
                                )
                            THEN 'VR' 
                            WHEN
                                (
                                    EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('VR')
                                    )
                                )
                            THEN 'VR' 
                            WHEN
                                (
                                    EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('UR')
                                    )
                                )
                            THEN 'UR' 
                            ELSE null
                        END AS status_verifikasi
        FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' left join m_referensi mr3 ON mr3.kd_ref = s.jenis_user_id and mr3.jns_ref = 'jenis_user_id'
        WHERE s.flag_show = 'Y' AND s.view_only = 'T' order by s.no_urut DESC
    ) x
    WHERE rn = 1
),
status_user AS (
SELECT *
    FROM (
select s.status_id, s.pengajuan_id, s.kd_status, s.flag_action, s.flag_show, s.view_only, s.unit_kerja_id, s.jenis_user_id, m1.ur_ref AS ur_jenis_user_id, s.role_id, s.jabatan_id, 
            CASE
                            WHEN
                                (
                                    NOT EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                    )
                                    OR EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('VR','UR')
                                    )
                                )
                            THEN 'Y'
                            ELSE 'T'
                        END AS status_verifikasi, 
                        ROW_NUMBER() OVER(
                            PARTITION BY s.pengajuan_id
                            ORDER BY s.no_urut DESC
                        ) rn 
            from d_status_pengajuan s left join m_referensi m1 on m1.kd_ref = s.jenis_user_id 
            and m1.jns_ref = 'jenis_user_id') x :condSuperAdmin
),
status_history AS (
SELECT *
    FROM (
select s.history_id, z.pengajuan_id, ROW_NUMBER() OVER (
                PARTITION BY s.history_id
                ORDER BY s.created_at DESC
            ) AS rn from d_status_pengajuan_history s join d_status_pengajuan z on s.status_id = z.status_id where s.qrcode is not null and s.role_user_id = :role_user order by s.created_at desc) x
    WHERE rn = 1 LIMIT 1
)
SELECT 
   -- ROW_NUMBER() OVER (:order_row) AS row_number,
   a.*,
   v.nama_vendor,
   mr1.ur_ref AS jenis_biaya,
   mr1.sub_kd_ref,
   mu.nip AS nik_pemohon, 
   mu.nama AS nama_pemohon,
   mru.jabatan_id,
   mr2.ur_ref AS jabatan,
   mru.cabang_id, 
   mr3.ur_ref AS cabang,
   sp.kegiatan AS status_kegiatan,
   sp.role AS status_unit,
   sp.role_id AS status_unit_role,
   sp.status_terbaru AS status_pengajuan,
   sp.unit_kerja_id AS status_unit_kerja_id,
   mr4.ur_ref AS status_unit_kerja,
   sp.jabatan_id AS status_jabatan_id,
   sp.jenis_user_id AS status_jenis_user_id,
   sp.ur_jenis_user_id AS status_ur_jenis_user_id,
   sp.jabatan_id AS status_jabatan_id,
   sp.status_verifikasi,
   sp.status_id,
   sa.flag_action AS user_flag_action,
   sa.kd_status AS user_kd_status,
   sa.status_verifikasi AS user_status_verifikasi,
   sa.view_only AS user_view_only,
   sa.jenis_user_id AS user_jenis_user_id,
   sa.status_id AS user_status_id,
   sa.ur_jenis_user_id AS user_ur_jenis_user_id,
   sp.kd_status,
   sh.history_id 
FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
left join status_history sh on sh.pengajuan_id = a.pengajuan_id 
left join m_role_user mru ON mru.role_user_id = a.role_pemohon_id
left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
left join m_referensi mr2 ON mr2.kd_ref = mru.jabatan_id and mr2.jns_ref = 'jabatan_id' 
left join m_referensi mr3 ON mr3.kd_ref = mru.cabang_id and mr3.jns_ref = 'cabang_id' 
left join status_pengajuan sp ON sp.pengajuan_id = a.pengajuan_id 
left join m_referensi mr4 ON mr4.kd_ref = sp.unit_kerja_id and mr4.jns_ref = 'unit_kerja_id' 
left join status_user sa ON sa.pengajuan_id = a.pengajuan_id 
left join m_vendor v on v.vendor_id = a.vendor_id 
WHERE a.flag_aktif = 'Y' and sa.view_only != 'YY' 
:condition :condSearch ORDER BY :order 
OFFSET (:page - 1) * :limit 
FETCH NEXT :limit ROWS ONLY;`

query.getListPengajuanPriority = `
WITH status_pengajuan AS (
SELECT *
    FROM (
        SELECT
            s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.unit_kerja_id, s.jabatan_id, s.flag_action, 
            s.view_only, s.jenis_user_id, mr3.ur_ref AS ur_jenis_user_id, s.status_id,
            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn,
            CASE
                            WHEN
                                (
                                    NOT EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                    )
                                )
                            THEN 'VR' 
                            WHEN
                                (
                                    EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('VR')
                                    )
                                )
                            THEN 'VR' 
                            WHEN
                                (
                                    EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('UR')
                                    )
                                )
                            THEN 'UR' 
                            ELSE null
                        END AS status_verifikasi
        FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' left join m_referensi mr3 ON mr3.kd_ref = s.jenis_user_id and mr3.jns_ref = 'jenis_user_id'
        WHERE s.flag_show = 'Y' AND s.view_only = 'T' order by s.no_urut DESC
    ) x
    WHERE rn = 1
),
status_user AS (
SELECT *
    FROM (
select s.status_id, s.pengajuan_id, s.kd_status, s.flag_action, s.flag_show, s.view_only, s.unit_kerja_id, s.jenis_user_id, m1.ur_ref AS ur_jenis_user_id, s.role_id, s.jabatan_id, 
CONCAT(
        EXTRACT(DAY FROM AGE(NOW(), s.start_status)), ' Hari ',
        EXTRACT(HOUR FROM AGE(NOW(), s.start_status)), ' Jam'
        ) AS keterlambatan,
            CASE
                            WHEN
                                (
                                    NOT EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                    )
                                    OR EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('VR','UR')
                                    )
                                )
                            THEN 'Y'
                            ELSE 'T'
                        END AS status_verifikasi, 
                        ROW_NUMBER() OVER(
                            PARTITION BY s.pengajuan_id
                            ORDER BY s.no_urut DESC
                        ) rn 
            from d_status_pengajuan s left join m_referensi m1 on m1.kd_ref = s.jenis_user_id 
            and m1.jns_ref = 'jenis_user_id') x :condSuperAdmin
),
status_history AS (
SELECT *
    FROM (
select s.history_id, z.pengajuan_id, ROW_NUMBER() OVER (
                PARTITION BY s.history_id
                ORDER BY s.created_at DESC
            ) AS rn from d_status_pengajuan_history s join d_status_pengajuan z on s.status_id = z.status_id where s.qrcode is not null and s.role_user_id = :role_user order by s.created_at desc) x
    WHERE rn = 1 LIMIT 1
)
SELECT 
   ROW_NUMBER() OVER (:order_row) AS row_number,
   a.*,
   v.nama_vendor,
   mr1.ur_ref AS jenis_biaya,
   mr1.sub_kd_ref,
   mu.nip AS nik_pemohon, 
   mu.nama AS nama_pemohon,
   mru.jabatan_id,
   mr2.ur_ref AS jabatan,
   mru.cabang_id, 
   mr3.ur_ref AS cabang,
   sp.kegiatan AS status_kegiatan,
   sp.role AS status_unit,
   sp.role_id AS status_unit_role,
   sp.status_terbaru AS status_pengajuan,
   sp.unit_kerja_id AS status_unit_kerja_id,
   mr4.ur_ref AS status_unit_kerja,
   sp.jabatan_id AS status_jabatan_id,
   sp.jenis_user_id AS status_jenis_user_id,
   sp.ur_jenis_user_id AS status_ur_jenis_user_id,
   sp.jabatan_id AS status_jabatan_id,
   sp.status_verifikasi,
   sp.status_id,
   sa.flag_action AS user_flag_action,
   sa.kd_status AS user_kd_status,
   sa.status_verifikasi AS user_status_verifikasi,
   sa.view_only AS user_view_only,
   sa.jenis_user_id AS user_jenis_user_id,
   sa.status_id AS user_status_id,
   sa.keterlambatan,
   sa.ur_jenis_user_id AS user_ur_jenis_user_id,
   sp.kd_status,
   sh.history_id 
FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
left join status_history sh on sh.pengajuan_id = a.pengajuan_id 
left join m_role_user mru ON mru.role_user_id = a.role_pemohon_id
left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
left join m_referensi mr2 ON mr2.kd_ref = mru.jabatan_id and mr2.jns_ref = 'jabatan_id' 
left join m_referensi mr3 ON mr3.kd_ref = mru.cabang_id and mr3.jns_ref = 'cabang_id' 
left join status_pengajuan sp ON sp.pengajuan_id = a.pengajuan_id 
left join m_referensi mr4 ON mr4.kd_ref = sp.unit_kerja_id and mr4.jns_ref = 'unit_kerja_id' 
left join status_user sa ON sa.pengajuan_id = a.pengajuan_id 
left join m_vendor v on v.vendor_id = a.vendor_id 
WHERE a.flag_aktif = 'Y' 
:condition :condSearch ORDER BY :order 
OFFSET (:page - 1) * :limit 
FETCH NEXT :limit ROWS ONLY;`

// query.getDashboardSummary = `
// WITH status_pengajuan AS (
//     SELECT *
//     FROM (
//         SELECT
//             s.pengajuan_id,
//             s.role_id,
//             s.kd_status,
//             s.flag_action,
//             s.no_urut,
//             ROW_NUMBER() OVER (
//                 PARTITION BY s.pengajuan_id
//                 ORDER BY s.no_urut DESC
//             ) AS rn
//         FROM d_status_pengajuan s
//         WHERE s.flag_show = 'Y'
//     ) x
//     WHERE rn = 1
// )

// SELECT
//     COUNT(*) AS total_pengajuan,
//     COALESCE(SUM(a.nominal_dpp),0) AS total_nominal_pengajuan,

//     -- Sudah Dibayarkan
//     COUNT(*) FILTER (
//         WHERE a.tgl_pembayaran IS NOT NULL
//     ) AS sudah_dibayarkan,

//     COALESCE(SUM(a.nominal_dpp) FILTER (
//         WHERE a.tgl_pembayaran IS NOT NULL
//     ),0) AS nominal_sudah_dibayarkan,

//     ROUND(
//         COUNT(*) FILTER (
//             WHERE a.tgl_pembayaran IS NOT NULL
//         ) * 100.0 / NULLIF(COUNT(*),0),
//         2
//     ) AS persen_sudah_dibayarkan,

//     -- Pengajuan Baru
//     COUNT(*) FILTER (
//         -- WHERE DATE(a.created_at)=CURRENT_DATE
//         WHERE sp.flag_action = 'Y' AND sp.role_id = 'RL02'
//     ) AS pengajuan_baru,

//     COALESCE(SUM(a.nominal_dpp) FILTER (
//         -- WHERE DATE(a.created_at)=CURRENT_DATE
//         WHERE sp.flag_action = 'Y' AND sp.role_id = 'RL02'
//     ),0) AS nominal_pengajuan_baru,

//     ROUND(
//         COUNT(*) FILTER (
//             -- WHERE DATE(a.created_at)=CURRENT_DATE
//             WHERE sp.flag_action = 'Y' AND sp.role_id = 'RL02'
//         ) * 100.0 / NULLIF(COUNT(*),0),
//         2
//     ) AS persen_pengajuan_baru,

//     -- Menunggu Verifikasi
//     COUNT(*) FILTER (
//         WHERE a.tgl_pembayaran IS NULL
//           AND sp.flag_action='Y'
//           AND sp.role_id NOT IN ('RL15')
//     ) AS menunggu_verifikasi,

//     COALESCE(SUM(a.nominal_dpp) FILTER (
//         WHERE a.tgl_pembayaran IS NULL
//           AND sp.flag_action='Y'
//           AND sp.role_id NOT IN ('RL15')
//     ),0) AS nominal_menunggu_verifikasi,

//     ROUND(
//         COUNT(*) FILTER (
//             WHERE a.tgl_pembayaran IS NULL
//               AND sp.flag_action='Y'
//               AND sp.role_id NOT IN ('RL15')
//         ) * 100.0 / NULLIF(COUNT(*),0),
//         2
//     ) AS persen_menunggu_verifikasi,

//     -- Menunggu Pembayaran
//     COUNT(*) FILTER (
//         WHERE a.tgl_pembayaran IS NULL
//           AND sp.flag_action='Y'
//           AND sp.role_id IN ('RL15')
//     ) AS menunggu_pembayaran,

//     COALESCE(SUM(a.nominal_dpp) FILTER (
//         WHERE a.tgl_pembayaran IS NULL
//           AND sp.flag_action='Y'
//           AND sp.role_id IN ('RL15')
//     ),0) AS nominal_menunggu_pembayaran,

//     ROUND(
//         COUNT(*) FILTER (
//             WHERE a.tgl_pembayaran IS NULL
//               AND sp.flag_action='Y'
//               AND sp.role_id IN ('RL15')
//         ) * 100.0 / NULLIF(COUNT(*),0),
//         2
//     ) AS persen_menunggu_pembayaran,

//     -- Ditolak
//     COUNT(*) FILTER (
//         WHERE sp.kd_status='T'
//     ) AS ditolak,

//     COALESCE(SUM(a.nominal_dpp) FILTER (
//         WHERE sp.kd_status='T'
//     ),0) AS nominal_ditolak,

//     ROUND(
//         COUNT(*) FILTER (
//             WHERE sp.kd_status='T'
//         ) * 100.0 / NULLIF(COUNT(*),0),
//         2
//     ) AS persen_ditolak
// FROM d_pengajuan a
// LEFT JOIN status_pengajuan sp
//     ON sp.pengajuan_id = a.pengajuan_id 
// LEFT JOIN m_role_user mru
//     ON mru.role_user_id=a.role_pemohon_id 
// WHERE a.flag_aktif = 'Y' :condition;`

query.getDashboardSummary = `
WITH budget_biaya AS (
SELECT 
    a.anggaran_id, 
    SUM(a.besar_budget) AS total 
FROM 
    d_penambahan_anggaran a 
GROUP BY a.anggaran_id
),
realisasi AS (
SELECT 
    a.anggaran_id, 
    SUM(a.nominal) AS total 
FROM 
    d_pemakaian_anggaran a 
GROUP BY a.anggaran_id
),
sisa_anggaran AS (
    SELECT
        da.anggaran_id,
        da.cabang_id,

        COALESCE(bb.total,0) AS total_budget,
        COALESCE(r.total,0) AS total_realisasi,

        COALESCE(bb.total,0) - COALESCE(r.total,0) AS sisa_anggaran

    FROM d_anggaran da

    LEFT JOIN budget_biaya bb
        ON bb.anggaran_id = da.anggaran_id

    LEFT JOIN realisasi r
        ON r.anggaran_id = da.anggaran_id 
    
    LEFT JOIN m_coa_detail mcd 
        ON mcd.coa_detail_id = da.coa_detail_id 
    WHERE mcd.gl_account NOT IN ('12345678', '1202020109', '2107010107', '6702010101', '1106030902') :conBulan
),
status_pengajuan AS (
    SELECT *
    FROM (
        SELECT
            s.pengajuan_id,
            s.role_id,
            s.kd_status,
            s.flag_action,
            s.no_urut,
            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn
        FROM d_status_pengajuan s
        WHERE s.flag_show = 'Y' order by s.no_urut desc
    ) x
    WHERE rn = 1
)

SELECT
    COUNT(*) AS total_pengajuan,
    COALESCE(SUM(a.nominal_dpp),0) AS total_nominal_pengajuan,

    -- ==========================================
    -- Sudah Dibayarkan
    -- ==========================================

    COUNT(*) FILTER (
        WHERE a.flag_aktif = 'Y' AND a.tgl_pembayaran IS NOT NULL
    ) AS sudah_dibayarkan,

    COALESCE(
        SUM(a.nominal_dpp) FILTER (
            WHERE a.tgl_pembayaran IS NOT NULL
        ),
        0
    ) AS nominal_sudah_dibayarkan,

    ROUND(
        (
            COALESCE(
                SUM(a.nominal_dpp) FILTER (
                    WHERE a.tgl_pembayaran IS NOT NULL
                ),
                0
            ) * 100
            /
            NULLIF(COALESCE(SUM(a.nominal_dpp),0),0)
        )::numeric,
        2
    ) AS persen_sudah_dibayarkan,

    -- ==========================================
    -- Pengajuan Baru
    -- ==========================================

    COUNT(*) FILTER (
        WHERE sp.flag_action='Y'
          AND sp.role_id='RL02'
    ) AS pengajuan_baru,

    COALESCE(
        SUM(a.nominal_dpp) FILTER (
            WHERE sp.flag_action='Y'
              AND sp.role_id='RL02'
        ),
        0
    ) AS nominal_pengajuan_baru,

    ROUND(
        (
            COALESCE(
                SUM(a.nominal_dpp) FILTER (
                    WHERE sp.flag_action='Y'
                      AND sp.role_id='RL02'
                ),
                0
            ) * 100
            /
            NULLIF(COALESCE(SUM(a.nominal_dpp),0),0)
        )::numeric,
        2
    ) AS persen_pengajuan_baru,

    -- ==========================================
    -- Menunggu Verifikasi
    -- ==========================================

    COUNT(*) FILTER (
        WHERE a.tgl_pembayaran IS NULL
          AND sp.flag_action='Y'
          AND sp.role_id NOT IN ('RL15', 'RL01', 'RL02', 'RL09', 'RL10', 'RL11')
    ) AS menunggu_verifikasi,

    COALESCE(
        SUM(a.nominal_dpp) FILTER (
            WHERE a.tgl_pembayaran IS NULL
              AND sp.flag_action='Y'
              AND sp.role_id NOT IN ('RL15', 'RL01', 'RL02', 'RL09', 'RL10', 'RL11')
        ),
        0
    ) AS nominal_menunggu_verifikasi,

    ROUND(
        (
            COALESCE(
                SUM(a.nominal_dpp) FILTER (
                    WHERE a.tgl_pembayaran IS NULL
                      AND sp.flag_action='Y'
                      AND sp.role_id NOT IN ('RL15', 'RL01', 'RL02', 'RL09', 'RL10', 'RL11')
                ),
                0
            ) * 100
            /
            NULLIF(COALESCE(SUM(a.nominal_dpp),0),0)
        )::numeric,
        2
    ) AS persen_menunggu_verifikasi,

    -- ==========================================
    -- Menunggu Pembayaran
    -- ==========================================

    COUNT(*) FILTER (
        WHERE a.tgl_pembayaran IS NULL
          AND sp.flag_action = 'Y' AND sp.role_id IN ('RL09', 'RL10', 'RL11', 'RL15')
    ) AS menunggu_pembayaran,

    COALESCE(
        SUM(a.nominal_dpp) FILTER (
            WHERE a.tgl_pembayaran IS NULL
              AND sp.flag_action = 'Y' AND sp.role_id IN ('RL09', 'RL10', 'RL11', 'RL15')
        ),
        0
    ) AS nominal_menunggu_pembayaran,

    ROUND(
        (
            COALESCE(
                SUM(a.nominal_dpp) FILTER (
                    WHERE a.tgl_pembayaran IS NULL
                      AND sp.flag_action = 'Y' AND sp.role_id IN ('RL09', 'RL10', 'RL11', 'RL15')
                ),
                0
            ) * 100
            /
            NULLIF(COALESCE(SUM(a.nominal_dpp),0),0)
        )::numeric,
        2
    ) AS persen_menunggu_pembayaran,

    -- ==========================================
    -- Ditolak
    -- ==========================================

    COUNT(*) FILTER (
        WHERE sp.kd_status='T'
    ) AS ditolak,

    COALESCE(
        SUM(a.nominal_dpp) FILTER (
            WHERE sp.kd_status='T'
        ),
        0
    ) AS nominal_ditolak,

    ROUND(
        (
            COALESCE(
                SUM(a.nominal_dpp) FILTER (
                    WHERE sp.kd_status='T'
                ),
                0
            ) * 100
            /
            NULLIF(COALESCE(SUM(a.nominal_dpp),0),0)
        )::numeric,
        2
    ) AS persen_ditolak,
        (
        SELECT COALESCE(SUM(sa.sisa_anggaran),0)
        FROM sisa_anggaran sa
        WHERE sa.cabang_id = '2000'
    ) AS sisa_anggaran_pusat,

    (
        SELECT COALESCE(SUM(sa.sisa_anggaran),0)
        FROM sisa_anggaran sa
        WHERE sa.cabang_id != '2000' :conAnggaran
    ) AS sisa_anggaran_cabang 
FROM d_pengajuan a

LEFT JOIN status_pengajuan sp
    ON sp.pengajuan_id = a.pengajuan_id

LEFT JOIN m_role_user mru
    ON mru.role_user_id = a.role_pemohon_id

WHERE a.flag_aktif = 'Y'
:condition;
`;

query.getPengajuanSummary = `
WITH status_pengajuan AS (
    SELECT *
    FROM (
        SELECT
            s.pengajuan_id,
            s.role_id,
            s.kd_status,
            s.flag_action,
            ROW_NUMBER() OVER(
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) rn
        FROM d_status_pengajuan s
        WHERE s.flag_show='Y'
    ) x
    WHERE rn=1
),

summary AS (

SELECT

COUNT(*) AS total,

COUNT(*) FILTER(
    WHERE a.tgl_pembayaran IS NOT NULL
) AS sudah_dibayarkan,

COUNT(*) FILTER(
    -- WHERE DATE(a.created_at)=CURRENT_DATE
    WHERE sp.flag_action = 'Y' AND sp.role_id = 'RL02'
) AS pengajuan_baru,

COUNT(*) FILTER(
    WHERE a.tgl_pembayaran IS NULL
          AND sp.flag_action='Y'
          AND sp.role_id NOT IN ('RL15', 'RL01', 'RL02', 'RL09', 'RL10', 'RL11')
) AS menunggu_verifikasi,

COUNT(*) FILTER(
    WHERE a.tgl_pembayaran IS NULL
          AND sp.flag_action = 'Y' AND sp.role_id IN ('RL09', 'RL10', 'RL11', 'RL15')
) AS menunggu_pembayaran,

COUNT(*) FILTER(
    WHERE sp.kd_status='T'
) AS ditolak

FROM d_pengajuan a
LEFT JOIN status_pengajuan sp
       ON sp.pengajuan_id=a.pengajuan_id
LEFT JOIN m_role_user mru
       ON mru.role_user_id=a.role_pemohon_id

WHERE
    a.flag_aktif='Y'
    :condition
)
SELECT
    *,
    (
        sudah_dibayarkan+
        pengajuan_baru+
        menunggu_verifikasi+
        menunggu_pembayaran+
        ditolak
    ) total,

    ROUND(
        sudah_dibayarkan*100.0/
        NULLIF(
            sudah_dibayarkan+
            pengajuan_baru+
            menunggu_verifikasi+
            menunggu_pembayaran+
            ditolak,0
        ),2
    ) persen_sudah_dibayarkan,

    ROUND(
        pengajuan_baru*100.0/
        NULLIF(
            sudah_dibayarkan+
            pengajuan_baru+
            menunggu_verifikasi+
            menunggu_pembayaran+
            ditolak,0
        ),2
    ) persen_pengajuan_baru,

    ROUND(
        menunggu_verifikasi*100.0/
        NULLIF(
            sudah_dibayarkan+
            pengajuan_baru+
            menunggu_verifikasi+
            menunggu_pembayaran+
            ditolak,0
        ),2
    ) persen_menunggu_verifikasi,

    ROUND(
        menunggu_pembayaran*100.0/
        NULLIF(
            sudah_dibayarkan+
            pengajuan_baru+
            menunggu_verifikasi+
            menunggu_pembayaran+
            ditolak,0
        ),2
    ) persen_menunggu_pembayaran,

    ROUND(
        ditolak*100.0/
        NULLIF(
            sudah_dibayarkan+
            pengajuan_baru+
            menunggu_verifikasi+
            menunggu_pembayaran+
            ditolak,0
        ),2
    ) persen_ditolak

FROM summary;`

// query.getMonitoringSummary = `
// WITH bulan AS (
//     SELECT generate_series(1,12) AS bulan_ke
// ),
// status_pengajuan AS (
//     SELECT *
//     FROM (
//         SELECT
//             s.pengajuan_id,
//             s.role_id,
//             s.kd_status,
//             s.flag_action,
//             ROW_NUMBER() OVER (
//                 PARTITION BY s.pengajuan_id
//                 ORDER BY s.no_urut DESC
//             ) rn
//         FROM d_status_pengajuan s
//         WHERE s.flag_show='Y'
//     ) x
//     WHERE rn=1
// ),
// summary AS (

// SELECT
//     EXTRACT(MONTH FROM a.created_at) bulan_ke,

//     COUNT(*) total_pengajuan,

//     COUNT(*) FILTER(
//         WHERE DATE(a.created_at)=CURRENT_DATE
//     ) pengajuan_baru,

//     COUNT(*) FILTER(
//         WHERE a.tgl_pembayaran IS NULL
//           AND sp.flag_action='Y'
//           AND sp.role_id NOT IN ('RL15', 'RL01', 'RL02', 'RL09', 'RL10', 'RL11')
//     ) menunggu_verifikasi,

//     COUNT(*) FILTER(
//         WHERE a.tgl_pembayaran IS NULL
//           AND sp.flag_action = 'Y' AND sp.role_id IN ('RL09', 'RL10', 'RL11', 'RL15')
//     ) menunggu_pembayaran,

//     COUNT(*) FILTER(
//         WHERE a.tgl_pembayaran IS NOT NULL
//     ) sudah_dibayarkan,

//     COUNT(*) FILTER(
//         WHERE sp.kd_status='T'
//     ) ditolak

// FROM d_pengajuan a

// LEFT JOIN status_pengajuan sp
// ON sp.pengajuan_id=a.pengajuan_id

// LEFT JOIN m_role_user mru
// ON mru.role_user_id=a.role_pemohon_id

// WHERE
//     a.flag_aktif='Y'
//     :condition

// GROUP BY
//     EXTRACT(MONTH FROM a.created_at)

// )

// SELECT
//     b.bulan_ke,

//     TO_CHAR(
//         MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,b.bulan_ke,1),
//         'Mon'
//     ) bulan,

//     COALESCE(s.total_pengajuan,0) total_pengajuan,
//     COALESCE(s.pengajuan_baru,0) pengajuan_baru,
//     COALESCE(s.menunggu_verifikasi,0) menunggu_verifikasi,
//     COALESCE(s.menunggu_pembayaran,0) menunggu_pembayaran,
//     COALESCE(s.sudah_dibayarkan,0) sudah_dibayarkan,
//     COALESCE(s.ditolak,0) ditolak

// FROM bulan b

// LEFT JOIN summary s
// ON s.bulan_ke=b.bulan_ke

// ORDER BY b.bulan_ke;`

query.getMonitoringSummary = `
WITH bulan AS (
    SELECT generate_series(1,12) AS bulan_ke
),

status_pengajuan AS (
    SELECT *
    FROM (
        SELECT
            s.pengajuan_id,
            s.role_id,
            s.kd_status,
            s.flag_action,

            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) rn

        FROM d_status_pengajuan s

        WHERE
            s.flag_show = 'Y'
    ) x

    WHERE
        rn = 1
),

summary AS (

    SELECT

        EXTRACT(MONTH FROM a.created_at) AS bulan_ke,

        /* =========================================
           TOTAL PENGAJUAN
        ========================================= */
        COUNT(*) AS total_pengajuan,


        /* =========================================
           PENGAJUAN BARU
        ========================================= */
        COUNT(*) FILTER(
            WHERE DATE(a.created_at) = CURRENT_DATE
        ) AS pengajuan_baru,


        /* =========================================
           MENUNGGU VERIFIKASI
        ========================================= */
        COUNT(*) FILTER(
            WHERE
                a.tgl_pembayaran IS NULL
                AND sp.flag_action = 'Y'
                AND sp.role_id NOT IN (
                    'RL15',
                    'RL01',
                    'RL02',
                    'RL09',
                    'RL10',
                    'RL11'
                )
        ) AS menunggu_verifikasi,


        /* =========================================
           MENUNGGU PEMBAYARAN
        ========================================= */
        COUNT(*) FILTER(
            WHERE
                a.tgl_pembayaran IS NULL
                AND sp.flag_action = 'Y'
                AND sp.role_id IN (
                    'RL09',
                    'RL10',
                    'RL11',
                    'RL15'
                )
        ) AS menunggu_pembayaran,


        /* =========================================
           SUDAH DIBAYARKAN
        ========================================= */
        COUNT(*) FILTER(
            WHERE
                a.tgl_pembayaran IS NOT NULL
        ) AS sudah_dibayarkan,


        /* =========================================
           DITOLAK
        ========================================= */
        COUNT(*) FILTER(
            WHERE
                sp.kd_status = 'T'
        ) AS ditolak

    FROM d_pengajuan a

    LEFT JOIN status_pengajuan sp
        ON sp.pengajuan_id = a.pengajuan_id

    LEFT JOIN m_role_user mru
        ON mru.role_user_id = a.role_pemohon_id

    WHERE
        a.flag_aktif = 'Y'
        :condition

    GROUP BY
        EXTRACT(MONTH FROM a.created_at)
)

SELECT

    /* =========================================
       IDENTITAS BULAN
    ========================================= */
    b.bulan_ke,

    TO_CHAR(
        MAKE_DATE(
            EXTRACT(YEAR FROM CURRENT_DATE)::int,
            b.bulan_ke,
            1
        ),
        'Mon'
    ) AS bulan,


    /* =========================================
       RESPONSE LAMA
       TETAP DIPERTAHANKAN
    ========================================= */

    COALESCE(s.total_pengajuan, 0)
        AS total_pengajuan,

    COALESCE(s.pengajuan_baru, 0)
        AS pengajuan_baru,

    COALESCE(s.menunggu_verifikasi, 0)
        AS menunggu_verifikasi,

    COALESCE(s.menunggu_pembayaran, 0)
        AS menunggu_pembayaran,

    COALESCE(s.sudah_dibayarkan, 0)
        AS sudah_dibayarkan,

    COALESCE(s.ditolak, 0)
        AS ditolak,


    /* =========================================
       TOTAL STATUS
       
       Ini mengikuti konsep query kedua.
       Digunakan sebagai denominator persentase.
    ========================================= */

    (
        COALESCE(s.sudah_dibayarkan, 0)
        +
        COALESCE(s.pengajuan_baru, 0)
        +
        COALESCE(s.menunggu_verifikasi, 0)
        +
        COALESCE(s.menunggu_pembayaran, 0)
        +
        COALESCE(s.ditolak, 0)
    ) AS total,


    /* =========================================
       PERSENTASE SUDAH DIBAYARKAN
    ========================================= */

    ROUND(
        COALESCE(s.sudah_dibayarkan, 0) * 100.0
        /
        NULLIF(
            (
                COALESCE(s.sudah_dibayarkan, 0)
                +
                COALESCE(s.pengajuan_baru, 0)
                +
                COALESCE(s.menunggu_verifikasi, 0)
                +
                COALESCE(s.menunggu_pembayaran, 0)
                +
                COALESCE(s.ditolak, 0)
            ),
            0
        ),
        2
    ) AS persen_sudah_dibayarkan,


    /* =========================================
       PERSENTASE PENGAJUAN BARU
    ========================================= */

    ROUND(
        COALESCE(s.pengajuan_baru, 0) * 100.0
        /
        NULLIF(
            (
                COALESCE(s.sudah_dibayarkan, 0)
                +
                COALESCE(s.pengajuan_baru, 0)
                +
                COALESCE(s.menunggu_verifikasi, 0)
                +
                COALESCE(s.menunggu_pembayaran, 0)
                +
                COALESCE(s.ditolak, 0)
            ),
            0
        ),
        2
    ) AS persen_pengajuan_baru,


    /* =========================================
       PERSENTASE MENUNGGU VERIFIKASI
    ========================================= */

    ROUND(
        COALESCE(s.menunggu_verifikasi, 0) * 100.0
        /
        NULLIF(
            (
                COALESCE(s.sudah_dibayarkan, 0)
                +
                COALESCE(s.pengajuan_baru, 0)
                +
                COALESCE(s.menunggu_verifikasi, 0)
                +
                COALESCE(s.menunggu_pembayaran, 0)
                +
                COALESCE(s.ditolak, 0)
            ),
            0
        ),
        2
    ) AS persen_menunggu_verifikasi,


    /* =========================================
       PERSENTASE MENUNGGU PEMBAYARAN
    ========================================= */

    ROUND(
        COALESCE(s.menunggu_pembayaran, 0) * 100.0
        /
        NULLIF(
            (
                COALESCE(s.sudah_dibayarkan, 0)
                +
                COALESCE(s.pengajuan_baru, 0)
                +
                COALESCE(s.menunggu_verifikasi, 0)
                +
                COALESCE(s.menunggu_pembayaran, 0)
                +
                COALESCE(s.ditolak, 0)
            ),
            0
        ),
        2
    ) AS persen_menunggu_pembayaran,


    /* =========================================
       PERSENTASE DITOLAK
    ========================================= */

    ROUND(
        COALESCE(s.ditolak, 0) * 100.0
        /
        NULLIF(
            (
                COALESCE(s.sudah_dibayarkan, 0)
                +
                COALESCE(s.pengajuan_baru, 0)
                +
                COALESCE(s.menunggu_verifikasi, 0)
                +
                COALESCE(s.menunggu_pembayaran, 0)
                +
                COALESCE(s.ditolak, 0)
            ),
            0
        ),
        2
    ) AS persen_ditolak

FROM bulan b

LEFT JOIN summary s
    ON s.bulan_ke = b.bulan_ke

ORDER BY
    b.bulan_ke;
`

query.getSummaryReport = `
SELECT
    COUNT(*) AS total_data,
    COALESCE(SUM(nominal_dpp), 0) AS total_nominal_dpp,
    COALESCE(SUM(CASE WHEN tipe_ppn = 'exclude' THEN nominal_ppn ELSE 0 END), 0) AS total_nominal_ppn_wapu,
    COALESCE(SUM(CASE WHEN tipe_ppn = 'include' THEN nominal_ppn ELSE 0 END), 0) AS total_nominal_ppn_nonwapu,
    COALESCE(SUM(nominal_pph), 0) AS total_nominal_pph,
    COALESCE(SUM(total_dibayarkan), 0) AS total_dibayarkan
FROM d_pengajuan a left join m_role_user mru on mru.role_user_id = a.role_pemohon_id 
WHERE flag_aktif = 'Y' :cabang :bulan;
`

query.getListAllPengajuan = `
WITH status_pengajuan AS (
SELECT *
    FROM (
        SELECT
            s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.unit_kerja_id, s.jabatan_id, s.flag_action, s.start_status, s.end_status,
            s.view_only, s.jenis_user_id, mr3.ur_ref AS ur_jenis_user_id, s.status_id,
            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn,
            CASE
                            WHEN
                                (
                                    NOT EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                    )
                                )
                            THEN 'VR' 
                            WHEN
                                (
                                    EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('VR')
                                    )
                                )
                            THEN 'VR' 
                            WHEN
                                (
                                    EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('UR')
                                    )
                                )
                            THEN 'UR' 
                            ELSE null
                        END AS status_verifikasi
        FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' left join m_referensi mr3 ON mr3.kd_ref = s.jenis_user_id and mr3.jns_ref = 'jenis_user_id'
        WHERE s.flag_show = 'Y' AND s.view_only = 'T' order by s.no_urut DESC
    ) x
    WHERE rn = 1
),
sla_pengajuan AS (
SELECT 
    SUM(ds.sla) AS sla, ds.pengajuan_id 
FROM d_status_pengajuan ds 
GROUP BY ds.pengajuan_id
)
SELECT 
   ROW_NUMBER() OVER (ORDER BY a.no_pengajuan ASC) AS row_number,
   a.*,
   TO_CHAR(a.tgl_pembayaran, 'DD/MM/YYYY') as tgl_pembayaran_pengajuan,
   TO_CHAR(a.created_at, 'DD/MM/YYYY HH24:MI:SS') as tgl_pengajuan,
   v.nama_vendor,
   v.npwp_vendor,
   mr1.ur_ref AS jenis_biaya,
   mr1.sub_kd_ref,
   mu.nip AS nik_pemohon, 
   mu.nama AS nama_pemohon,
   mru.jabatan_id,
   mr2.ur_ref AS jabatan,
   mru.cabang_id, 
   mr3.ur_ref AS cabang,
   sp.kegiatan AS status_kegiatan,
   sp.role AS status_unit,
   sp.role_id AS status_unit_role,
   sp.status_terbaru AS status_pengajuan,
   sp.unit_kerja_id AS status_unit_kerja_id,
   mr4.ur_ref AS status_unit_kerja,
   sp.jabatan_id AS status_jabatan_id,
   sp.jenis_user_id AS status_jenis_user_id,
   sp.ur_jenis_user_id AS status_ur_jenis_user_id,
   sp.jabatan_id AS status_jabatan_id,
   sp.status_verifikasi,
   sp.status_id,
   sp.kd_status,
   CASE WHEN sp.kd_status = 'S2' AND (select dss.status_id from d_status_pengajuan dss where dss.pengajuan_id = a.pengajuan_id order by dss.no_urut desc limit 1) = sp.status_id 
   THEN '1' ELSE '0' END AS status_selesai,
   CASE WHEN sp.kd_status = 'S2' AND (select dss.status_id from d_status_pengajuan dss where dss.pengajuan_id = a.pengajuan_id order by dss.no_urut desc limit 1) = sp.status_id 
   THEN CONCAT(
        EXTRACT(DAY FROM AGE(sp.end_status, a.created_at)), ' Hari ',
        EXTRACT(HOUR FROM AGE(sp.end_status, a.created_at)), ' Jam'
        )
   ELSE 
        CONCAT(
        EXTRACT(DAY FROM AGE(COALESCE(sp.end_status, NOW()), a.created_at)), ' Hari ',
        EXTRACT(HOUR FROM AGE(COALESCE(sp.end_status, NOW()), a.created_at)), ' Jam'
        )
   END AS sla_pengajuan, 
   CASE WHEN sp.kd_status = 'S2' AND (select dss.status_id from d_status_pengajuan dss where dss.pengajuan_id = a.pengajuan_id order by dss.no_urut desc limit 1) = sp.status_id 
   THEN ROUND(
        EXTRACT(EPOCH FROM (sp.end_status - a.created_at)) / 86400,
        1
        )
   ELSE 
        ROUND(
        EXTRACT(EPOCH FROM (COALESCE(sp.end_status, NOW()) - a.created_at)) / 86400,
        1
        )
   END AS cond_sla,
   jp.jenis_jasa,
   jp.kode_objek,
   jp.persen_tarif 
FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
left join m_role_user mru ON mru.role_user_id = a.role_pemohon_id 
left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
left join m_referensi mr2 ON mr2.kd_ref = mru.jabatan_id and mr2.jns_ref = 'jabatan_id' 
left join m_referensi mr3 ON mr3.kd_ref = mru.cabang_id and mr3.jns_ref = 'cabang_id' 
left join status_pengajuan sp ON sp.pengajuan_id = a.pengajuan_id 
left join m_referensi mr4 ON mr4.kd_ref = sp.unit_kerja_id and mr4.jns_ref = 'unit_kerja_id' 
left join m_vendor v on v.vendor_id = a.vendor_id 
left join sla_pengajuan slp ON slp.pengajuan_id = a.pengajuan_id 
left join m_jenis_pajak jp on jp.jenis_pajak_id = a.jenis_pajak_id 
WHERE a.flag_aktif = 'Y' :cabang :bulan :condition ORDER BY a.no_pengajuan ASC 
OFFSET (:page - 1) * :limit 
FETCH NEXT :limit ROWS ONLY;`

// query.getListAllPengajuanDashboard = `
// WITH status_pengajuan AS (
// SELECT *
//     FROM (
//         SELECT
//             s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.unit_kerja_id, s.jabatan_id, s.flag_action, s.start_status, s.end_status,
//             s.view_only, s.jenis_user_id, mr3.ur_ref AS ur_jenis_user_id, s.status_id,
//             ROW_NUMBER() OVER (
//                 PARTITION BY s.pengajuan_id
//                 ORDER BY s.no_urut DESC
//             ) AS rn,
//             CASE
//                             WHEN
//                                 (
//                                     NOT EXISTS (
//                                         SELECT 1
//                                         FROM d_status_pengajuan x
//                                         WHERE x.pengajuan_id = s.pengajuan_id
//                                         AND x.unit_kerja_id = s.unit_kerja_id
//                                         AND x.jenis_user_id != '1'
//                                     )
//                                 )
//                             THEN 'VR' 
//                             WHEN
//                                 (
//                                     EXISTS (
//                                         SELECT 1
//                                         FROM d_status_pengajuan x
//                                         WHERE x.pengajuan_id = s.pengajuan_id
//                                         AND x.unit_kerja_id = s.unit_kerja_id
//                                         AND x.jenis_user_id != '1'
//                                         AND x.kd_status IN ('VR')
//                                     )
//                                 )
//                             THEN 'VR' 
//                             WHEN
//                                 (
//                                     EXISTS (
//                                         SELECT 1
//                                         FROM d_status_pengajuan x
//                                         WHERE x.pengajuan_id = s.pengajuan_id
//                                         AND x.unit_kerja_id = s.unit_kerja_id
//                                         AND x.jenis_user_id != '1'
//                                         AND x.kd_status IN ('UR')
//                                     )
//                                 )
//                             THEN 'UR' 
//                             ELSE null
//                         END AS status_verifikasi
//         FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' left join m_referensi mr3 ON mr3.kd_ref = s.jenis_user_id and mr3.jns_ref = 'jenis_user_id'
//         WHERE s.flag_show = 'Y' AND s.view_only = 'T' order by s.no_urut DESC
//     ) x
//     WHERE rn = 1
// ),
// sla_pengajuan AS (
// SELECT 
//     SUM(ds.sla) AS sla, ds.pengajuan_id 
// FROM d_status_pengajuan ds 
// GROUP BY ds.pengajuan_id
// ),
// sla_detail AS (
//     SELECT
//         a.pengajuan_id,
//         a.target_sla,

//         GREATEST(
//             (
//                 SELECT COUNT(*)
//                 FROM generate_series(
//                     DATE(a.start_status),
//                     DATE(COALESCE(a.end_status, CURRENT_DATE)),
//                     INTERVAL '1 day'
//                 ) AS g(hari)
//                 WHERE
//                     -- Senin - Jumat
//                     EXTRACT(ISODOW FROM g.hari) < 6

//                     -- Tidak termasuk hari libur
//                     AND NOT EXISTS (
//                         SELECT 1
//                         FROM m_hari_libur h
//                         WHERE h.tanggal = DATE(g.hari)
//                     )
//             ) - 1,
//             0
//         ) AS sla_hari_kerja

//     FROM d_status_pengajuan a
//     JOIN d_pengajuan b
//         ON b.pengajuan_id = a.pengajuan_id

//     WHERE
//         a.start_status IS NOT NULL
//         AND b.flag_aktif = 'Y' 
//         AND a.role_id NOT IN ('RL01', 'RL02')
//         AND a.view_only = 'T'
//         AND a.jenis_user_id = '1'
//         AND a.unit_id IS NOT NULL
// ),
// pengajuan_sla AS (
//     SELECT
//         pengajuan_id,
//         MAX(
//             CASE
//                 WHEN sla_hari_kerja > target_sla THEN 1
//                 ELSE 0
//             END
//         ) AS is_over
//     FROM sla_detail
//     GROUP BY pengajuan_id
// )
// SELECT 
//    ROW_NUMBER() OVER (ORDER BY a.no_pengajuan ASC) AS row_number,
//    a.*,
//    TO_CHAR(a.tgl_pembayaran, 'DD/MM/YYYY') as tgl_pembayaran_pengajuan,
//    TO_CHAR(a.created_at, 'DD/MM/YYYY HH24:MI:SS') as tgl_pengajuan,
//    v.nama_vendor,
//    mr1.ur_ref AS jenis_biaya,
//    mr1.sub_kd_ref,
//    mu.nip AS nik_pemohon, 
//    mu.nama AS nama_pemohon,
//    mru.jabatan_id,
//    mr2.ur_ref AS jabatan,
//    mru.cabang_id, 
//    mr3.ur_ref AS cabang,
//    sp.kegiatan AS status_kegiatan,
//    sp.role AS status_unit,
//    sp.role_id AS status_unit_role,
//    sp.status_terbaru AS status_pengajuan,
//    sp.unit_kerja_id AS status_unit_kerja_id,
//    mr4.ur_ref AS status_unit_kerja,
//    sp.jabatan_id AS status_jabatan_id,
//    sp.jenis_user_id AS status_jenis_user_id,
//    sp.ur_jenis_user_id AS status_ur_jenis_user_id,
//    sp.jabatan_id AS status_jabatan_id,
//    sp.status_verifikasi,
//    sp.status_id,
//    sp.kd_status,
//    CASE WHEN sp.kd_status = 'S2' AND (select dss.status_id from d_status_pengajuan dss where dss.pengajuan_id = a.pengajuan_id order by dss.no_urut desc limit 1) = sp.status_id 
//    THEN '1' ELSE '0' END AS status_selesai,
//    CASE WHEN sp.kd_status = 'S2' AND (select dss.status_id from d_status_pengajuan dss where dss.pengajuan_id = a.pengajuan_id order by dss.no_urut desc limit 1) = sp.status_id 
//    THEN CONCAT(
//         EXTRACT(DAY FROM AGE(sp.end_status, a.created_at)), ' Hari ',
//         EXTRACT(HOUR FROM AGE(sp.end_status, a.created_at)), ' Jam'
//         )
//    ELSE 
//         CONCAT(
//         EXTRACT(DAY FROM AGE(COALESCE(sp.end_status, NOW()), a.created_at)), ' Hari ',
//         EXTRACT(HOUR FROM AGE(COALESCE(sp.end_status, NOW()), a.created_at)), ' Jam'
//         )
//    END AS sla_pengajuan, 
//    CASE WHEN sp.kd_status = 'S2' AND (select dss.status_id from d_status_pengajuan dss where dss.pengajuan_id = a.pengajuan_id order by dss.no_urut desc limit 1) = sp.status_id 
//    THEN ROUND(
//         EXTRACT(EPOCH FROM (sp.end_status - a.created_at)) / 86400,
//         1
//         )
//    ELSE 
//         ROUND(
//         EXTRACT(EPOCH FROM (COALESCE(sp.end_status, NOW()) - a.created_at)) / 86400,
//         1
//         )
//    END AS cond_sla 
// FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
// left join m_role_user mru ON mru.role_user_id = a.role_pemohon_id
// left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
// left join m_referensi mr2 ON mr2.kd_ref = mru.jabatan_id and mr2.jns_ref = 'jabatan_id' 
// left join m_referensi mr3 ON mr3.kd_ref = mru.cabang_id and mr3.jns_ref = 'cabang_id' 
// left join status_pengajuan sp ON sp.pengajuan_id = a.pengajuan_id 
// left join m_referensi mr4 ON mr4.kd_ref = sp.unit_kerja_id and mr4.jns_ref = 'unit_kerja_id' 
// left join m_vendor v on v.vendor_id = a.vendor_id 
// left join sla_pengajuan slp ON slp.pengajuan_id = a.pengajuan_id 
// left join pengajuan_sla ps ON ps.pengajuan_id = a.pengajuan_id 
// WHERE a.flag_aktif = 'Y' :cabang :condition ORDER BY a.no_pengajuan ASC 
// OFFSET (:page - 1) * :limit 
// FETCH NEXT :limit ROWS ONLY;`
query.getListAllPengajuanDashboard = `
WITH status_pengajuan AS (
    SELECT *
    FROM (
        SELECT
            s.pengajuan_id,
            s.role_id,
            s.kegiatan,
            mr1.ur_ref AS role,
            mr2.ur_ref AS status_terbaru,
            s.kd_status,
            s.unit_kerja_id,
            s.jabatan_id,
            s.flag_action,
            s.start_status,
            s.end_status,
            s.view_only,
            s.jenis_user_id,
            mr3.ur_ref AS ur_jenis_user_id,
            s.status_id,

            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn,

            CASE
                WHEN (
                    NOT EXISTS (
                        SELECT 1
                        FROM d_status_pengajuan x
                        WHERE x.pengajuan_id = s.pengajuan_id
                          AND x.unit_kerja_id = s.unit_kerja_id
                          AND x.jenis_user_id != '1'
                    )
                )
                THEN 'VR'

                WHEN (
                    EXISTS (
                        SELECT 1
                        FROM d_status_pengajuan x
                        WHERE x.pengajuan_id = s.pengajuan_id
                          AND x.unit_kerja_id = s.unit_kerja_id
                          AND x.jenis_user_id != '1'
                          AND x.kd_status IN ('VR')
                    )
                )
                THEN 'VR'

                WHEN (
                    EXISTS (
                        SELECT 1
                        FROM d_status_pengajuan x
                        WHERE x.pengajuan_id = s.pengajuan_id
                          AND x.unit_kerja_id = s.unit_kerja_id
                          AND x.jenis_user_id != '1'
                          AND x.kd_status IN ('UR')
                    )
                )
                THEN 'UR'

                ELSE NULL
            END AS status_verifikasi

        FROM d_status_pengajuan s

        LEFT JOIN m_referensi mr1
            ON mr1.kd_ref = s.role_id
            AND mr1.jns_ref = 'role_id'

        LEFT JOIN m_referensi mr2
            ON mr2.kd_ref = s.kd_status
            AND mr2.jns_ref = 'kd_status'

        LEFT JOIN m_referensi mr3
            ON mr3.kd_ref = s.jenis_user_id
            AND mr3.jns_ref = 'jenis_user_id'

        WHERE
            s.flag_show = 'Y'
            AND s.view_only = 'T'

        ORDER BY s.no_urut DESC
    ) x
    WHERE rn = 1
),

sla_pengajuan AS (
    SELECT
        SUM(ds.sla) AS sla,
        ds.pengajuan_id
    FROM d_status_pengajuan ds
    GROUP BY ds.pengajuan_id
),

/*
 * Ambil START, END dan TARGET SLA berdasarkan prioritas:
 *
 * START:
 *   1. jenis_user_id = 2
 *   2. jika tidak ada -> jenis_user_id = 1
 *
 * END:
 *   selalu jenis_user_id = 1
 *
 * TARGET SLA:
 *   selalu jenis_user_id = 1
 */
status_prioritas AS (
    SELECT
        d.pengajuan_id,
        d.role_id,
        d.unit_id,

        /*
         * START STATUS USER 2
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '2'
                    THEN d.start_status
            END
        ) AS start_status_user_2,

        /*
         * START STATUS USER 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.start_status
            END
        ) AS start_status_user_1,

        /*
         * END STATUS USER 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.end_status
            END
        ) AS end_status_user_1,

        /*
         * TARGET SLA USER 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.target_sla
            END
        ) AS target_sla_user_1

    FROM d_status_pengajuan d

    JOIN d_pengajuan b
        ON b.pengajuan_id = d.pengajuan_id

    WHERE
        d.start_status IS NOT NULL
        AND b.flag_aktif = 'Y'
        AND d.role_id NOT IN ('RL01', 'RL02')
        AND d.view_only = 'T'
        AND d.unit_id IS NOT NULL
        AND d.jenis_user_id IN ('1', '2')

    GROUP BY
        d.pengajuan_id,
        d.role_id,
        d.unit_id
),

sla_detail AS (
    SELECT
        d.pengajuan_id,
        d.role_id,
        d.unit_id,

        /*
         * START STATUS:
         * user 2 terlebih dahulu,
         * fallback ke user 1
         */
        COALESCE(
            d.start_status_user_2,
            d.start_status_user_1
        ) AS start_status,

        /*
         * END STATUS:
         * selalu user 1
         */
        d.end_status_user_1 AS end_status,

        /*
         * TARGET SLA:
         * selalu user 1
         */
        d.target_sla_user_1 AS target_sla,

        GREATEST(
            (
                SELECT COUNT(*)
                FROM generate_series(
                    DATE(
                        COALESCE(
                            d.start_status_user_2,
                            d.start_status_user_1
                        )
                    ),
                    DATE(
                        COALESCE(
                            d.end_status_user_1,
                            CURRENT_DATE
                        )
                    ),
                    INTERVAL '1 day'
                ) AS g(hari)

                WHERE
                    -- Senin - Jumat
                    EXTRACT(ISODOW FROM g.hari) < 6

                    -- Tidak termasuk hari libur
                    AND NOT EXISTS (
                        SELECT 1
                        FROM m_hari_libur h
                        WHERE h.tanggal = DATE(g.hari)
                    )
            ) - 1,
            0
        ) AS sla_hari_kerja

    FROM status_prioritas d
),

pengajuan_sla AS (
    SELECT
        pengajuan_id,

        /*
         * Jika salah satu task over SLA,
         * maka pengajuan dianggap over SLA
         */
        MAX(
            CASE
                WHEN sla_hari_kerja > target_sla
                    THEN 1
                ELSE 0
            END
        ) AS is_over

    FROM sla_detail

    GROUP BY
        pengajuan_id
)

SELECT
    ROW_NUMBER() OVER (
        ORDER BY a.no_pengajuan ASC
    ) AS row_number,

    a.*,

    TO_CHAR(
        a.tgl_pembayaran,
        'DD/MM/YYYY'
    ) AS tgl_pembayaran_pengajuan,

    TO_CHAR(
        a.created_at,
        'DD/MM/YYYY HH24:MI:SS'
    ) AS tgl_pengajuan,

    v.nama_vendor,

    mr1.ur_ref AS jenis_biaya,
    mr1.sub_kd_ref,

    mu.nip AS nik_pemohon,
    mu.nama AS nama_pemohon,

    mru.jabatan_id,
    mr2.ur_ref AS jabatan,

    mru.cabang_id,
    mr3.ur_ref AS cabang,

    sp.kegiatan AS status_kegiatan,
    sp.role AS status_unit,
    sp.role_id AS status_unit_role,
    sp.status_terbaru AS status_pengajuan,
    sp.unit_kerja_id AS status_unit_kerja_id,
    mr4.ur_ref AS status_unit_kerja,
    sp.jabatan_id AS status_jabatan_id,
    sp.jenis_user_id AS status_jenis_user_id,
    sp.ur_jenis_user_id AS status_ur_jenis_user_id,
    sp.jabatan_id AS status_jabatan_id,
    sp.status_verifikasi,
    sp.status_id,
    sp.kd_status,

    CASE
        WHEN sp.kd_status = 'S2'
             AND (
                 SELECT dss.status_id
                 FROM d_status_pengajuan dss
                 WHERE dss.pengajuan_id = a.pengajuan_id
                 ORDER BY dss.no_urut DESC
                 LIMIT 1
             ) = sp.status_id
        THEN '1'
        ELSE '0'
    END AS status_selesai,

    CASE
        WHEN sp.kd_status = 'S2'
             AND (
                 SELECT dss.status_id
                 FROM d_status_pengajuan dss
                 WHERE dss.pengajuan_id = a.pengajuan_id
                 ORDER BY dss.no_urut DESC
                 LIMIT 1
             ) = sp.status_id
        THEN CONCAT(
            EXTRACT(
                DAY FROM AGE(
                    sp.end_status,
                    a.created_at
                )
            ),
            ' Hari ',
            EXTRACT(
                HOUR FROM AGE(
                    sp.end_status,
                    a.created_at
                )
            ),
            ' Jam'
        )
        ELSE CONCAT(
            EXTRACT(
                DAY FROM AGE(
                    COALESCE(sp.end_status, NOW()),
                    a.created_at
                )
            ),
            ' Hari ',
            EXTRACT(
                HOUR FROM AGE(
                    COALESCE(sp.end_status, NOW()),
                    a.created_at
                )
            ),
            ' Jam'
        )
    END AS sla_pengajuan,

    CASE
        WHEN sp.kd_status = 'S2'
             AND (
                 SELECT dss.status_id
                 FROM d_status_pengajuan dss
                 WHERE dss.pengajuan_id = a.pengajuan_id
                 ORDER BY dss.no_urut DESC
                 LIMIT 1
             ) = sp.status_id
        THEN ROUND(
            EXTRACT(
                EPOCH FROM (
                    sp.end_status - a.created_at
                )
            ) / 86400,
            1
        )
        ELSE ROUND(
            EXTRACT(
                EPOCH FROM (
                    COALESCE(sp.end_status, NOW())
                    - a.created_at
                )
            ) / 86400,
            1
        )
    END AS cond_sla

FROM d_pengajuan a

LEFT JOIN m_user mu
    ON a.pemohon_id = mu.user_id

LEFT JOIN m_role_user mru
    ON mru.role_user_id = a.role_pemohon_id

LEFT JOIN m_referensi mr1
    ON mr1.kd_ref = a.jenis_biaya_id
    AND mr1.jns_ref = 'jenis_biaya_id'

LEFT JOIN m_referensi mr2
    ON mr2.kd_ref = mru.jabatan_id
    AND mr2.jns_ref = 'jabatan_id'

LEFT JOIN m_referensi mr3
    ON mr3.kd_ref = mru.cabang_id
    AND mr3.jns_ref = 'cabang_id'

LEFT JOIN status_pengajuan sp
    ON sp.pengajuan_id = a.pengajuan_id

LEFT JOIN m_referensi mr4
    ON mr4.kd_ref = sp.unit_kerja_id
    AND mr4.jns_ref = 'unit_kerja_id'

LEFT JOIN m_vendor v
    ON v.vendor_id = a.vendor_id

LEFT JOIN sla_pengajuan slp
    ON slp.pengajuan_id = a.pengajuan_id

LEFT JOIN pengajuan_sla ps
    ON ps.pengajuan_id = a.pengajuan_id

WHERE
    a.flag_aktif = 'Y'
    :cabang
    :condition

ORDER BY
    a.no_pengajuan ASC

OFFSET (:page - 1) * :limit

FETCH NEXT :limit ROWS ONLY;
`

// query.getListAllPengajuanDashboardDownload = `
// WITH status_pengajuan AS (
// SELECT *
//     FROM (
//         SELECT
//             s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.unit_kerja_id, s.jabatan_id, s.flag_action, s.start_status, s.end_status,
//             s.view_only, s.jenis_user_id, mr3.ur_ref AS ur_jenis_user_id, s.status_id,
//             ROW_NUMBER() OVER (
//                 PARTITION BY s.pengajuan_id
//                 ORDER BY s.no_urut DESC
//             ) AS rn,
//             CASE
//                             WHEN
//                                 (
//                                     NOT EXISTS (
//                                         SELECT 1
//                                         FROM d_status_pengajuan x
//                                         WHERE x.pengajuan_id = s.pengajuan_id
//                                         AND x.unit_kerja_id = s.unit_kerja_id
//                                         AND x.jenis_user_id != '1'
//                                     )
//                                 )
//                             THEN 'VR' 
//                             WHEN
//                                 (
//                                     EXISTS (
//                                         SELECT 1
//                                         FROM d_status_pengajuan x
//                                         WHERE x.pengajuan_id = s.pengajuan_id
//                                         AND x.unit_kerja_id = s.unit_kerja_id
//                                         AND x.jenis_user_id != '1'
//                                         AND x.kd_status IN ('VR')
//                                     )
//                                 )
//                             THEN 'VR' 
//                             WHEN
//                                 (
//                                     EXISTS (
//                                         SELECT 1
//                                         FROM d_status_pengajuan x
//                                         WHERE x.pengajuan_id = s.pengajuan_id
//                                         AND x.unit_kerja_id = s.unit_kerja_id
//                                         AND x.jenis_user_id != '1'
//                                         AND x.kd_status IN ('UR')
//                                     )
//                                 )
//                             THEN 'UR' 
//                             ELSE null
//                         END AS status_verifikasi
//         FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' left join m_referensi mr3 ON mr3.kd_ref = s.jenis_user_id and mr3.jns_ref = 'jenis_user_id'
//         WHERE s.flag_show = 'Y' AND s.view_only = 'T' order by s.no_urut DESC
//     ) x
//     WHERE rn = 1
// ),
// sla_pengajuan AS (
// SELECT 
//     SUM(ds.sla) AS sla, ds.pengajuan_id 
// FROM d_status_pengajuan ds 
// GROUP BY ds.pengajuan_id
// ),
// sla_detail AS (
//     SELECT
//         a.pengajuan_id,
//         a.target_sla,

//         GREATEST(
//             (
//                 SELECT COUNT(*)
//                 FROM generate_series(
//                     DATE(a.start_status),
//                     DATE(COALESCE(a.end_status, CURRENT_DATE)),
//                     INTERVAL '1 day'
//                 ) AS g(hari)
//                 WHERE
//                     -- Senin - Jumat
//                     EXTRACT(ISODOW FROM g.hari) < 6

//                     -- Tidak termasuk hari libur
//                     AND NOT EXISTS (
//                         SELECT 1
//                         FROM m_hari_libur h
//                         WHERE h.tanggal = DATE(g.hari)
//                     )
//             ) - 1,
//             0
//         ) AS sla_hari_kerja

//     FROM d_status_pengajuan a
//     JOIN d_pengajuan b
//         ON b.pengajuan_id = a.pengajuan_id

//     WHERE
//         a.start_status IS NOT NULL
//         AND b.flag_aktif = 'Y' 
//         AND a.role_id NOT IN ('RL01', 'RL02')
//         AND a.view_only = 'T'
//         AND a.jenis_user_id = '1'
//         AND a.unit_id IS NOT NULL
// ),
// pengajuan_sla AS (
//     SELECT
//         pengajuan_id,
//         MAX(
//             CASE
//                 WHEN sla_hari_kerja > target_sla THEN 1
//                 ELSE 0
//             END
//         ) AS is_over
//     FROM sla_detail
//     GROUP BY pengajuan_id
// )
// SELECT 
//    ROW_NUMBER() OVER (ORDER BY a.no_pengajuan ASC) AS row_number,
//    a.*,
//    TO_CHAR(a.tgl_pembayaran, 'DD/MM/YYYY') as tgl_pembayaran_pengajuan,
//    TO_CHAR(a.created_at, 'DD/MM/YYYY HH24:MI:SS') as tgl_pengajuan,
//    v.nama_vendor,
//    mr1.ur_ref AS jenis_biaya,
//    mr1.sub_kd_ref,
//    mu.nip AS nik_pemohon, 
//    mu.nama AS nama_pemohon,
//    mru.jabatan_id,
//    mr2.ur_ref AS jabatan,
//    mru.cabang_id, 
//    mr3.ur_ref AS cabang,
//    sp.kegiatan AS status_kegiatan,
//    sp.role AS status_unit,
//    sp.role_id AS status_unit_role,
//    sp.status_terbaru AS status_pengajuan,
//    sp.unit_kerja_id AS status_unit_kerja_id,
//    mr4.ur_ref AS status_unit_kerja,
//    sp.jabatan_id AS status_jabatan_id,
//    sp.jenis_user_id AS status_jenis_user_id,
//    sp.ur_jenis_user_id AS status_ur_jenis_user_id,
//    sp.jabatan_id AS status_jabatan_id,
//    sp.status_verifikasi,
//    sp.status_id,
//    sp.kd_status,
//    CASE WHEN sp.kd_status = 'S2' AND (select dss.status_id from d_status_pengajuan dss where dss.pengajuan_id = a.pengajuan_id order by dss.no_urut desc limit 1) = sp.status_id 
//    THEN '1' ELSE '0' END AS status_selesai,
//    CASE WHEN sp.kd_status = 'S2' AND (select dss.status_id from d_status_pengajuan dss where dss.pengajuan_id = a.pengajuan_id order by dss.no_urut desc limit 1) = sp.status_id 
//    THEN CONCAT(
//         EXTRACT(DAY FROM AGE(sp.end_status, a.created_at)), ' Hari ',
//         EXTRACT(HOUR FROM AGE(sp.end_status, a.created_at)), ' Jam'
//         )
//    ELSE 
//         CONCAT(
//         EXTRACT(DAY FROM AGE(COALESCE(sp.end_status, NOW()), a.created_at)), ' Hari ',
//         EXTRACT(HOUR FROM AGE(COALESCE(sp.end_status, NOW()), a.created_at)), ' Jam'
//         )
//    END AS sla_pengajuan, 
//    CASE WHEN sp.kd_status = 'S2' AND (select dss.status_id from d_status_pengajuan dss where dss.pengajuan_id = a.pengajuan_id order by dss.no_urut desc limit 1) = sp.status_id 
//    THEN ROUND(
//         EXTRACT(EPOCH FROM (sp.end_status - a.created_at)) / 86400,
//         1
//         )
//    ELSE 
//         ROUND(
//         EXTRACT(EPOCH FROM (COALESCE(sp.end_status, NOW()) - a.created_at)) / 86400,
//         1
//         )
//    END AS cond_sla 
// FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
// left join m_role_user mru ON mru.role_user_id = a.role_pemohon_id
// left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
// left join m_referensi mr2 ON mr2.kd_ref = mru.jabatan_id and mr2.jns_ref = 'jabatan_id' 
// left join m_referensi mr3 ON mr3.kd_ref = mru.cabang_id and mr3.jns_ref = 'cabang_id' 
// left join status_pengajuan sp ON sp.pengajuan_id = a.pengajuan_id 
// left join m_referensi mr4 ON mr4.kd_ref = sp.unit_kerja_id and mr4.jns_ref = 'unit_kerja_id' 
// left join m_vendor v on v.vendor_id = a.vendor_id 
// left join sla_pengajuan slp ON slp.pengajuan_id = a.pengajuan_id 
// left join pengajuan_sla ps ON ps.pengajuan_id = a.pengajuan_id 
// WHERE a.flag_aktif = 'Y' :cabang :condition ORDER BY a.no_pengajuan ASC;`
query.getListAllPengajuanDashboardDownload = `
WITH status_pengajuan AS (
    SELECT *
    FROM (
        SELECT
            s.pengajuan_id,
            s.role_id,
            s.kegiatan,
            mr1.ur_ref AS role,
            mr2.ur_ref AS status_terbaru,
            s.kd_status,
            s.unit_kerja_id,
            s.jabatan_id,
            s.flag_action,
            s.start_status,
            s.end_status,
            s.view_only,
            s.jenis_user_id,
            mr3.ur_ref AS ur_jenis_user_id,
            s.status_id,

            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn,

            CASE
                WHEN (
                    NOT EXISTS (
                        SELECT 1
                        FROM d_status_pengajuan x
                        WHERE x.pengajuan_id = s.pengajuan_id
                          AND x.unit_kerja_id = s.unit_kerja_id
                          AND x.jenis_user_id != '1'
                    )
                )
                THEN 'VR'

                WHEN (
                    EXISTS (
                        SELECT 1
                        FROM d_status_pengajuan x
                        WHERE x.pengajuan_id = s.pengajuan_id
                          AND x.unit_kerja_id = s.unit_kerja_id
                          AND x.jenis_user_id != '1'
                          AND x.kd_status IN ('VR')
                    )
                )
                THEN 'VR'

                WHEN (
                    EXISTS (
                        SELECT 1
                        FROM d_status_pengajuan x
                        WHERE x.pengajuan_id = s.pengajuan_id
                          AND x.unit_kerja_id = s.unit_kerja_id
                          AND x.jenis_user_id != '1'
                          AND x.kd_status IN ('UR')
                    )
                )
                THEN 'UR'

                ELSE NULL
            END AS status_verifikasi

        FROM d_status_pengajuan s

        LEFT JOIN m_referensi mr1
            ON mr1.kd_ref = s.role_id
            AND mr1.jns_ref = 'role_id'

        LEFT JOIN m_referensi mr2
            ON mr2.kd_ref = s.kd_status
            AND mr2.jns_ref = 'kd_status'

        LEFT JOIN m_referensi mr3
            ON mr3.kd_ref = s.jenis_user_id
            AND mr3.jns_ref = 'jenis_user_id'

        WHERE
            s.flag_show = 'Y'
            AND s.view_only = 'T'

        ORDER BY s.no_urut DESC
    ) x

    WHERE rn = 1
),

sla_pengajuan AS (
    SELECT
        SUM(ds.sla) AS sla,
        ds.pengajuan_id
    FROM d_status_pengajuan ds
    GROUP BY ds.pengajuan_id
),

/*
 * STATUS PRIORITAS
 *
 * START STATUS:
 *   - Prioritas jenis_user_id = 2
 *   - Jika tidak ada, gunakan jenis_user_id = 1
 *
 * END STATUS:
 *   - Selalu jenis_user_id = 1
 *
 * TARGET SLA:
 *   - Selalu jenis_user_id = 1
 */
status_prioritas AS (
    SELECT
        d.pengajuan_id,
        d.role_id,
        d.unit_id,

        /*
         * START STATUS USER 2
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '2'
                    THEN d.start_status
            END
        ) AS start_status_user_2,

        /*
         * START STATUS USER 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.start_status
            END
        ) AS start_status_user_1,

        /*
         * END STATUS USER 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.end_status
            END
        ) AS end_status_user_1,

        /*
         * TARGET SLA USER 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.target_sla
            END
        ) AS target_sla_user_1

    FROM d_status_pengajuan d

    JOIN d_pengajuan b
        ON b.pengajuan_id = d.pengajuan_id

    WHERE
        d.start_status IS NOT NULL
        AND b.flag_aktif = 'Y'
        AND d.role_id NOT IN ('RL01', 'RL02')
        AND d.view_only = 'T'
        AND d.unit_id IS NOT NULL
        AND d.jenis_user_id IN ('1', '2')

    GROUP BY
        d.pengajuan_id,
        d.role_id,
        d.unit_id
),

sla_detail AS (
    SELECT
        d.pengajuan_id,
        d.role_id,
        d.unit_id,

        /*
         * START:
         * user 2 terlebih dahulu,
         * fallback ke user 1
         */
        COALESCE(
            d.start_status_user_2,
            d.start_status_user_1
        ) AS start_status,

        /*
         * END:
         * selalu user 1
         */
        d.end_status_user_1 AS end_status,

        /*
         * TARGET SLA:
         * selalu user 1
         */
        d.target_sla_user_1 AS target_sla,

        GREATEST(
            (
                SELECT COUNT(*)
                FROM generate_series(
                    DATE(
                        COALESCE(
                            d.start_status_user_2,
                            d.start_status_user_1
                        )
                    ),
                    DATE(
                        COALESCE(
                            d.end_status_user_1,
                            CURRENT_DATE
                        )
                    ),
                    INTERVAL '1 day'
                ) AS g(hari)

                WHERE
                    -- Senin - Jumat
                    EXTRACT(ISODOW FROM g.hari) < 6

                    -- Tidak termasuk hari libur
                    AND NOT EXISTS (
                        SELECT 1
                        FROM m_hari_libur h
                        WHERE h.tanggal = DATE(g.hari)
                    )
            ) - 1,
            0
        ) AS sla_hari_kerja

    FROM status_prioritas d
),

pengajuan_sla AS (
    SELECT
        pengajuan_id,

        MAX(
            CASE
                WHEN sla_hari_kerja > target_sla
                    THEN 1
                ELSE 0
            END
        ) AS is_over

    FROM sla_detail

    GROUP BY
        pengajuan_id
)

SELECT
    ROW_NUMBER() OVER (
        ORDER BY a.no_pengajuan ASC
    ) AS row_number,

    a.*,

    TO_CHAR(
        a.tgl_pembayaran,
        'DD/MM/YYYY'
    ) AS tgl_pembayaran_pengajuan,

    TO_CHAR(
        a.created_at,
        'DD/MM/YYYY HH24:MI:SS'
    ) AS tgl_pengajuan,

    v.nama_vendor,

    mr1.ur_ref AS jenis_biaya,
    mr1.sub_kd_ref,

    mu.nip AS nik_pemohon,
    mu.nama AS nama_pemohon,

    mru.jabatan_id,
    mr2.ur_ref AS jabatan,

    mru.cabang_id,
    mr3.ur_ref AS cabang,

    sp.kegiatan AS status_kegiatan,
    sp.role AS status_unit,
    sp.role_id AS status_unit_role,
    sp.status_terbaru AS status_pengajuan,
    sp.unit_kerja_id AS status_unit_kerja_id,
    mr4.ur_ref AS status_unit_kerja,
    sp.jabatan_id AS status_jabatan_id,
    sp.jenis_user_id AS status_jenis_user_id,
    sp.ur_jenis_user_id AS status_ur_jenis_user_id,
    sp.jabatan_id AS status_jabatan_id,
    sp.status_verifikasi,
    sp.status_id,
    sp.kd_status,

    CASE
        WHEN sp.kd_status = 'S2'
             AND (
                 SELECT dss.status_id
                 FROM d_status_pengajuan dss
                 WHERE dss.pengajuan_id = a.pengajuan_id
                 ORDER BY dss.no_urut DESC
                 LIMIT 1
             ) = sp.status_id
        THEN '1'
        ELSE '0'
    END AS status_selesai,

    CASE
        WHEN sp.kd_status = 'S2'
             AND (
                 SELECT dss.status_id
                 FROM d_status_pengajuan dss
                 WHERE dss.pengajuan_id = a.pengajuan_id
                 ORDER BY dss.no_urut DESC
                 LIMIT 1
             ) = sp.status_id
        THEN CONCAT(
            EXTRACT(
                DAY FROM AGE(
                    sp.end_status,
                    a.created_at
                )
            ),
            ' Hari ',
            EXTRACT(
                HOUR FROM AGE(
                    sp.end_status,
                    a.created_at
                )
            ),
            ' Jam'
        )
        ELSE CONCAT(
            EXTRACT(
                DAY FROM AGE(
                    COALESCE(sp.end_status, NOW()),
                    a.created_at
                )
            ),
            ' Hari ',
            EXTRACT(
                HOUR FROM AGE(
                    COALESCE(sp.end_status, NOW()),
                    a.created_at
                )
            ),
            ' Jam'
        )
    END AS sla_pengajuan,

    CASE
        WHEN sp.kd_status = 'S2'
             AND (
                 SELECT dss.status_id
                 FROM d_status_pengajuan dss
                 WHERE dss.pengajuan_id = a.pengajuan_id
                 ORDER BY dss.no_urut DESC
                 LIMIT 1
             ) = sp.status_id
        THEN ROUND(
            EXTRACT(
                EPOCH FROM (
                    sp.end_status - a.created_at
                )
            ) / 86400,
            1
        )
        ELSE ROUND(
            EXTRACT(
                EPOCH FROM (
                    COALESCE(sp.end_status, NOW())
                    - a.created_at
                )
            ) / 86400,
            1
        )
    END AS cond_sla

FROM d_pengajuan a

LEFT JOIN m_user mu
    ON a.pemohon_id = mu.user_id

LEFT JOIN m_role_user mru
    ON mru.role_user_id = a.role_pemohon_id

LEFT JOIN m_referensi mr1
    ON mr1.kd_ref = a.jenis_biaya_id
    AND mr1.jns_ref = 'jenis_biaya_id'

LEFT JOIN m_referensi mr2
    ON mr2.kd_ref = mru.jabatan_id
    AND mr2.jns_ref = 'jabatan_id'

LEFT JOIN m_referensi mr3
    ON mr3.kd_ref = mru.cabang_id
    AND mr3.jns_ref = 'cabang_id'

LEFT JOIN status_pengajuan sp
    ON sp.pengajuan_id = a.pengajuan_id

LEFT JOIN m_referensi mr4
    ON mr4.kd_ref = sp.unit_kerja_id
    AND mr4.jns_ref = 'unit_kerja_id'

LEFT JOIN m_vendor v
    ON v.vendor_id = a.vendor_id

LEFT JOIN sla_pengajuan slp
    ON slp.pengajuan_id = a.pengajuan_id

LEFT JOIN pengajuan_sla ps
    ON ps.pengajuan_id = a.pengajuan_id

WHERE
    a.flag_aktif = 'Y'
    :cabang
    :condition

ORDER BY
    a.no_pengajuan ASC;
`;

// query.getListAllPengajuanSLAPerformance = `
// WITH sla_detail AS (
//     SELECT
//         d.pengajuan_id,
//         d.role_id,
//         d.unit_id,
//         d.target_sla,

//         GREATEST(
//             (
//                 SELECT COUNT(*)
//                 FROM generate_series(
//                     DATE(d.start_status),
//                     DATE(COALESCE(d.end_status, CURRENT_DATE)),
//                     INTERVAL '1 day'
//                 ) AS g(hari)

//                 WHERE EXTRACT(ISODOW FROM g.hari) < 6

//                   AND NOT EXISTS (
//                       SELECT 1
//                       FROM m_hari_libur h
//                       WHERE h.tanggal = DATE(g.hari)
//                   )
//             ) - 1,
//             0
//         ) AS sla_hari_kerja

//     FROM d_status_pengajuan d
//         LEFT JOIN d_pengajuan b ON b.pengajuan_id = d.pengajuan_id
//     WHERE d.start_status IS NOT NULL
//       AND d.view_only = 'T'
//       AND d.jenis_user_id = '1'
//       AND d.unit_id IS NOT NULL
//       AND b.flag_aktif = 'Y' 
//       AND d.role_id NOT IN ('RL01', 'RL02') 
//       :condition
// ),

// pengajuan_sla AS (
//     SELECT
//         z.pengajuan_id,

//         COUNT(*) AS task,

//         SUM(
//             CASE
//                 WHEN z.sla_hari_kerja <= z.target_sla
//                     THEN 1
//                 ELSE 0
//             END
//         ) AS on_sla,

//         SUM(
//             CASE
//                 WHEN z.sla_hari_kerja > z.target_sla
//                     THEN 1
//                 ELSE 0
//             END
//         ) AS over_sla,

//         ROUND(
//             SUM(
//                 CASE
//                     WHEN z.sla_hari_kerja <= z.target_sla
//                         THEN 1
//                     ELSE 0
//                 END
//             )::numeric
//             / NULLIF(COUNT(*), 0) * 100,
//             2
//         ) AS kpi

//     FROM sla_detail z

//     GROUP BY z.pengajuan_id
// ),
// status_pengajuan AS (
// SELECT *
//     FROM (
//         SELECT
//             s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.unit_kerja_id, s.jabatan_id, s.flag_action, s.start_status, s.end_status,
//             s.view_only, s.jenis_user_id, mr3.ur_ref AS ur_jenis_user_id, s.status_id,
//             ROW_NUMBER() OVER (
//                 PARTITION BY s.pengajuan_id
//                 ORDER BY s.no_urut DESC
//             ) AS rn,
//             CASE
//                             WHEN
//                                 (
//                                     NOT EXISTS (
//                                         SELECT 1
//                                         FROM d_status_pengajuan x
//                                         WHERE x.pengajuan_id = s.pengajuan_id
//                                         AND x.unit_kerja_id = s.unit_kerja_id
//                                         AND x.jenis_user_id != '1'
//                                     )
//                                 )
//                             THEN 'VR' 
//                             WHEN
//                                 (
//                                     EXISTS (
//                                         SELECT 1
//                                         FROM d_status_pengajuan x
//                                         WHERE x.pengajuan_id = s.pengajuan_id
//                                         AND x.unit_kerja_id = s.unit_kerja_id
//                                         AND x.jenis_user_id != '1'
//                                         AND x.kd_status IN ('VR')
//                                     )
//                                 )
//                             THEN 'VR' 
//                             WHEN
//                                 (
//                                     EXISTS (
//                                         SELECT 1
//                                         FROM d_status_pengajuan x
//                                         WHERE x.pengajuan_id = s.pengajuan_id
//                                         AND x.unit_kerja_id = s.unit_kerja_id
//                                         AND x.jenis_user_id != '1'
//                                         AND x.kd_status IN ('UR')
//                                     )
//                                 )
//                             THEN 'UR' 
//                             ELSE null
//                         END AS status_verifikasi
//         FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' left join m_referensi mr3 ON mr3.kd_ref = s.jenis_user_id and mr3.jns_ref = 'jenis_user_id'
//         WHERE s.flag_show = 'Y' AND s.view_only = 'T' order by s.no_urut DESC
//     ) x
//     WHERE rn = 1
// )
// SELECT
//     a.*,
//    TO_CHAR(a.tgl_pembayaran, 'DD/MM/YYYY') as tgl_pembayaran_pengajuan,
//    TO_CHAR(a.created_at, 'DD/MM/YYYY HH24:MI:SS') as tgl_pengajuan,
//    v.nama_vendor,
//    mr1.ur_ref AS jenis_biaya,
//    mr1.sub_kd_ref,
//    mu.nip AS nik_pemohon, 
//    mu.nama AS nama_pemohon,
//    mru.jabatan_id,
//    mr2.ur_ref AS jabatan,
//    mru.cabang_id, 
//    mr3.ur_ref AS cabang,
//    sp.kegiatan AS status_kegiatan,
//    sp.role AS status_unit,
//    sp.role_id AS status_unit_role,
//    sp.status_terbaru AS status_pengajuan,
//    sp.unit_kerja_id AS status_unit_kerja_id,
//    mr4.ur_ref AS status_unit_kerja,
//    sp.jabatan_id AS status_jabatan_id,
//    sp.jenis_user_id AS status_jenis_user_id,
//    sp.ur_jenis_user_id AS status_ur_jenis_user_id,
//    sp.jabatan_id AS status_jabatan_id,
//    sp.status_verifikasi,
//    sp.status_id,
//    sp.kd_status,
//    CASE WHEN sp.kd_status = 'S2' AND (select dss.status_id from d_status_pengajuan dss where dss.pengajuan_id = a.pengajuan_id order by dss.no_urut desc limit 1) = sp.status_id 
//    THEN '1' ELSE '0' END AS status_selesai,
//    CASE WHEN sp.kd_status = 'S2' AND (select dss.status_id from d_status_pengajuan dss where dss.pengajuan_id = a.pengajuan_id order by dss.no_urut desc limit 1) = sp.status_id 
//    THEN CONCAT(
//         EXTRACT(DAY FROM AGE(sp.end_status, a.created_at)), ' Hari ',
//         EXTRACT(HOUR FROM AGE(sp.end_status, a.created_at)), ' Jam'
//         )
//    ELSE 
//         CONCAT(
//         EXTRACT(DAY FROM AGE(COALESCE(sp.end_status, NOW()), a.created_at)), ' Hari ',
//         EXTRACT(HOUR FROM AGE(COALESCE(sp.end_status, NOW()), a.created_at)), ' Jam'
//         )
//    END AS sla_pengajuan, 
//    CASE WHEN sp.kd_status = 'S2' AND (select dss.status_id from d_status_pengajuan dss where dss.pengajuan_id = a.pengajuan_id order by dss.no_urut desc limit 1) = sp.status_id 
//    THEN ROUND(
//         EXTRACT(EPOCH FROM (sp.end_status - a.created_at)) / 86400,
//         1
//         )
//    ELSE 
//         ROUND(
//         EXTRACT(EPOCH FROM (COALESCE(sp.end_status, NOW()) - a.created_at)) / 86400,
//         1
//         )
//    END AS cond_sla 
// FROM pengajuan_sla ps JOIN
//     d_pengajuan a ON a.pengajuan_id = ps.pengajuan_id left join m_user mu ON a.pemohon_id = mu.user_id 
//     left join m_role_user mru ON mru.role_user_id = a.role_pemohon_id
//     left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
//     left join m_referensi mr2 ON mr2.kd_ref = mru.jabatan_id and mr2.jns_ref = 'jabatan_id' 
//     left join m_referensi mr3 ON mr3.kd_ref = mru.cabang_id and mr3.jns_ref = 'cabang_id' 
//     left join status_pengajuan sp ON sp.pengajuan_id = a.pengajuan_id 
//     left join m_referensi mr4 ON mr4.kd_ref = sp.unit_kerja_id and mr4.jns_ref = 'unit_kerja_id' 
//     left join m_vendor v on v.vendor_id = a.vendor_id  
// WHERE a.flag_aktif = 'Y'
//   :condSLA;`
query.getListAllPengajuanSLAPerformance = `
WITH status_prioritas AS (
    SELECT
        d.pengajuan_id,
        d.role_id,
        d.unit_id,

        /*
         * START STATUS:
         * Prioritas jenis_user_id = 2
         * Jika tidak ada, ambil jenis_user_id = 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '2'
                    THEN d.start_status
            END
        ) AS start_status_user_2,

        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.start_status
            END
        ) AS start_status_user_1,

        /*
         * END STATUS:
         * Selalu ambil dari jenis_user_id = 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.end_status
            END
        ) AS end_status_user_1,

        /*
         * TARGET SLA:
         * Selalu ambil dari jenis_user_id = 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.target_sla
            END
        ) AS target_sla_user_1

    FROM d_status_pengajuan d

    LEFT JOIN d_pengajuan b
        ON b.pengajuan_id = d.pengajuan_id

    WHERE
        d.start_status IS NOT NULL
        AND d.view_only = 'T'
        AND d.jenis_user_id IN ('1', '2')
        AND d.unit_id IS NOT NULL
        AND b.flag_aktif = 'Y'
        AND d.role_id NOT IN ('RL01', 'RL02')
        :condition

    GROUP BY
        d.pengajuan_id,
        d.role_id,
        d.unit_id
),

sla_detail AS (
    SELECT
        d.pengajuan_id,
        d.role_id,
        d.unit_id,

        /*
         * START STATUS:
         * Jenis user 2 terlebih dahulu,
         * jika tidak ada baru jenis user 1
         */
        COALESCE(
            d.start_status_user_2,
            d.start_status_user_1
        ) AS start_status,

        /*
         * END STATUS:
         * Selalu jenis user 1
         */
        d.end_status_user_1 AS end_status,

        /*
         * TARGET SLA:
         * Selalu jenis user 1
         */
        d.target_sla_user_1 AS target_sla,

        GREATEST(
            (
                SELECT COUNT(*)
                FROM generate_series(
                    DATE(
                        COALESCE(
                            d.start_status_user_2,
                            d.start_status_user_1
                        )
                    ),
                    DATE(
                        COALESCE(
                            d.end_status_user_1,
                            CURRENT_DATE
                        )
                    ),
                    INTERVAL '1 day'
                ) AS g(hari)

                WHERE
                    -- Senin - Jumat
                    EXTRACT(ISODOW FROM g.hari) < 6

                    -- Tidak termasuk hari libur
                    AND NOT EXISTS (
                        SELECT 1
                        FROM m_hari_libur h
                        WHERE h.tanggal = DATE(g.hari)
                    )
            ) - 1,
            0
        ) AS sla_hari_kerja

    FROM status_prioritas d
),

pengajuan_sla AS (
    SELECT
        z.pengajuan_id,

        COUNT(*) AS task,

        SUM(
            CASE
                WHEN z.sla_hari_kerja <= z.target_sla
                    THEN 1
                ELSE 0
            END
        ) AS on_sla,

        SUM(
            CASE
                WHEN z.sla_hari_kerja > z.target_sla
                    THEN 1
                ELSE 0
            END
        ) AS over_sla,

        ROUND(
            SUM(
                CASE
                    WHEN z.sla_hari_kerja <= z.target_sla
                        THEN 1
                    ELSE 0
                END
            )::numeric
            / NULLIF(COUNT(*), 0) * 100,
            2
        ) AS kpi

    FROM sla_detail z

    GROUP BY
        z.pengajuan_id
),

status_pengajuan AS (
    SELECT *
    FROM (
        SELECT
            s.pengajuan_id,
            s.role_id,
            s.kegiatan,
            mr1.ur_ref AS role,
            mr2.ur_ref AS status_terbaru,
            s.kd_status,
            s.unit_kerja_id,
            s.jabatan_id,
            s.flag_action,
            s.start_status,
            s.end_status,
            s.view_only,
            s.jenis_user_id,
            mr3.ur_ref AS ur_jenis_user_id,
            s.status_id,

            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn,

            CASE
                WHEN (
                    NOT EXISTS (
                        SELECT 1
                        FROM d_status_pengajuan x
                        WHERE x.pengajuan_id = s.pengajuan_id
                          AND x.unit_kerja_id = s.unit_kerja_id
                          AND x.jenis_user_id != '1'
                    )
                )
                THEN 'VR'

                WHEN (
                    EXISTS (
                        SELECT 1
                        FROM d_status_pengajuan x
                        WHERE x.pengajuan_id = s.pengajuan_id
                          AND x.unit_kerja_id = s.unit_kerja_id
                          AND x.jenis_user_id != '1'
                          AND x.kd_status IN ('VR')
                    )
                )
                THEN 'VR'

                WHEN (
                    EXISTS (
                        SELECT 1
                        FROM d_status_pengajuan x
                        WHERE x.pengajuan_id = s.pengajuan_id
                          AND x.unit_kerja_id = s.unit_kerja_id
                          AND x.jenis_user_id != '1'
                          AND x.kd_status IN ('UR')
                    )
                )
                THEN 'UR'

                ELSE NULL
            END AS status_verifikasi

        FROM d_status_pengajuan s

        LEFT JOIN m_referensi mr1
            ON mr1.kd_ref = s.role_id
            AND mr1.jns_ref = 'role_id'

        LEFT JOIN m_referensi mr2
            ON mr2.kd_ref = s.kd_status
            AND mr2.jns_ref = 'kd_status'

        LEFT JOIN m_referensi mr3
            ON mr3.kd_ref = s.jenis_user_id
            AND mr3.jns_ref = 'jenis_user_id'

        WHERE
            s.flag_show = 'Y'
            AND s.view_only = 'T'

        ORDER BY s.no_urut DESC
    ) x

    WHERE rn = 1
)

SELECT
    a.*,

    TO_CHAR(
        a.tgl_pembayaran,
        'DD/MM/YYYY'
    ) AS tgl_pembayaran_pengajuan,

    TO_CHAR(
        a.created_at,
        'DD/MM/YYYY HH24:MI:SS'
    ) AS tgl_pengajuan,

    v.nama_vendor,

    mr1.ur_ref AS jenis_biaya,
    mr1.sub_kd_ref,

    mu.nip AS nik_pemohon,
    mu.nama AS nama_pemohon,

    mru.jabatan_id,
    mr2.ur_ref AS jabatan,

    mru.cabang_id,
    mr3.ur_ref AS cabang,

    sp.kegiatan AS status_kegiatan,
    sp.role AS status_unit,
    sp.role_id AS status_unit_role,
    sp.status_terbaru AS status_pengajuan,
    sp.unit_kerja_id AS status_unit_kerja_id,
    mr4.ur_ref AS status_unit_kerja,
    sp.jabatan_id AS status_jabatan_id,
    sp.jenis_user_id AS status_jenis_user_id,
    sp.ur_jenis_user_id AS status_ur_jenis_user_id,
    sp.jabatan_id AS status_jabatan_id,
    sp.status_verifikasi,
    sp.status_id,
    sp.kd_status,

    CASE
        WHEN sp.kd_status = 'S2'
             AND (
                 SELECT dss.status_id
                 FROM d_status_pengajuan dss
                 WHERE dss.pengajuan_id = a.pengajuan_id
                 ORDER BY dss.no_urut DESC
                 LIMIT 1
             ) = sp.status_id
        THEN '1'
        ELSE '0'
    END AS status_selesai,

    CASE
        WHEN sp.kd_status = 'S2'
             AND (
                 SELECT dss.status_id
                 FROM d_status_pengajuan dss
                 WHERE dss.pengajuan_id = a.pengajuan_id
                 ORDER BY dss.no_urut DESC
                 LIMIT 1
             ) = sp.status_id
        THEN CONCAT(
            EXTRACT(
                DAY FROM AGE(
                    sp.end_status,
                    a.created_at
                )
            ),
            ' Hari ',
            EXTRACT(
                HOUR FROM AGE(
                    sp.end_status,
                    a.created_at
                )
            ),
            ' Jam'
        )
        ELSE CONCAT(
            EXTRACT(
                DAY FROM AGE(
                    COALESCE(sp.end_status, NOW()),
                    a.created_at
                )
            ),
            ' Hari ',
            EXTRACT(
                HOUR FROM AGE(
                    COALESCE(sp.end_status, NOW()),
                    a.created_at
                )
            ),
            ' Jam'
        )
    END AS sla_pengajuan,

    CASE
        WHEN sp.kd_status = 'S2'
             AND (
                 SELECT dss.status_id
                 FROM d_status_pengajuan dss
                 WHERE dss.pengajuan_id = a.pengajuan_id
                 ORDER BY dss.no_urut DESC
                 LIMIT 1
             ) = sp.status_id
        THEN ROUND(
            EXTRACT(
                EPOCH FROM (
                    sp.end_status - a.created_at
                )
            ) / 86400,
            1
        )
        ELSE ROUND(
            EXTRACT(
                EPOCH FROM (
                    COALESCE(sp.end_status, NOW())
                    - a.created_at
                )
            ) / 86400,
            1
        )
    END AS cond_sla

FROM pengajuan_sla ps

JOIN d_pengajuan a
    ON a.pengajuan_id = ps.pengajuan_id

LEFT JOIN m_user mu
    ON a.pemohon_id = mu.user_id

LEFT JOIN m_role_user mru
    ON mru.role_user_id = a.role_pemohon_id

LEFT JOIN m_referensi mr1
    ON mr1.kd_ref = a.jenis_biaya_id
    AND mr1.jns_ref = 'jenis_biaya_id'

LEFT JOIN m_referensi mr2
    ON mr2.kd_ref = mru.jabatan_id
    AND mr2.jns_ref = 'jabatan_id'

LEFT JOIN m_referensi mr3
    ON mr3.kd_ref = mru.cabang_id
    AND mr3.jns_ref = 'cabang_id'

LEFT JOIN status_pengajuan sp
    ON sp.pengajuan_id = a.pengajuan_id

LEFT JOIN m_referensi mr4
    ON mr4.kd_ref = sp.unit_kerja_id
    AND mr4.jns_ref = 'unit_kerja_id'

LEFT JOIN m_vendor v
    ON v.vendor_id = a.vendor_id

WHERE
    a.flag_aktif = 'Y'
    :condSLA;`

query.getListAllPengajuanSLAPerformanceDownload = `
WITH status_prioritas AS (
    SELECT
        d.pengajuan_id,
        d.role_id,
        d.unit_id,

        /*
         * START STATUS
         * Prioritas jenis_user_id = 2
         * Jika tidak ada, gunakan jenis_user_id = 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '2'
                    THEN d.start_status
            END
        ) AS start_status_user_2,

        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.start_status
            END
        ) AS start_status_user_1,

        /*
         * END STATUS
         * Selalu ambil dari jenis_user_id = 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.end_status
            END
        ) AS end_status_user_1,

        /*
         * TARGET SLA
         * Selalu ambil dari jenis_user_id = 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.target_sla
            END
        ) AS target_sla_user_1

    FROM d_status_pengajuan d

    LEFT JOIN d_pengajuan b
        ON b.pengajuan_id = d.pengajuan_id

    WHERE
        d.start_status IS NOT NULL
        AND d.view_only = 'T'
        AND d.jenis_user_id IN ('1', '2')
        AND d.unit_id IS NOT NULL
        AND b.flag_aktif = 'Y'
        AND d.role_id NOT IN ('RL01', 'RL02')
        :condition

    GROUP BY
        d.pengajuan_id,
        d.role_id,
        d.unit_id
),

sla_detail AS (
    SELECT
        d.pengajuan_id,
        d.role_id,
        d.unit_id,

        /*
         * START:
         * jenis user 2 terlebih dahulu,
         * jika tidak ada baru jenis user 1
         */
        COALESCE(
            d.start_status_user_2,
            d.start_status_user_1
        ) AS start_status,

        /*
         * END:
         * selalu jenis user 1
         */
        d.end_status_user_1 AS end_status,

        /*
         * TARGET SLA:
         * selalu jenis user 1
         */
        d.target_sla_user_1 AS target_sla,

        GREATEST(
            (
                SELECT COUNT(*)
                FROM generate_series(
                    DATE(
                        COALESCE(
                            d.start_status_user_2,
                            d.start_status_user_1
                        )
                    ),
                    DATE(
                        COALESCE(
                            d.end_status_user_1,
                            CURRENT_DATE
                        )
                    ),
                    INTERVAL '1 day'
                ) AS g(hari)

                WHERE
                    -- Senin - Jumat
                    EXTRACT(ISODOW FROM g.hari) < 6

                    -- Tidak termasuk hari libur
                    AND NOT EXISTS (
                        SELECT 1
                        FROM m_hari_libur h
                        WHERE h.tanggal = DATE(g.hari)
                    )
            ) - 1,
            0
        ) AS sla_hari_kerja

    FROM status_prioritas d
),

pengajuan_sla AS (
    SELECT
        z.pengajuan_id,

        COUNT(*) AS task,

        SUM(
            CASE
                WHEN z.sla_hari_kerja <= z.target_sla
                    THEN 1
                ELSE 0
            END
        ) AS on_sla,

        SUM(
            CASE
                WHEN z.sla_hari_kerja > z.target_sla
                    THEN 1
                ELSE 0
            END
        ) AS over_sla,

        ROUND(
            SUM(
                CASE
                    WHEN z.sla_hari_kerja <= z.target_sla
                        THEN 1
                    ELSE 0
                END
            )::numeric
            / NULLIF(COUNT(*), 0) * 100,
            2
        ) AS kpi

    FROM sla_detail z

    GROUP BY
        z.pengajuan_id
),

status_pengajuan AS (
    SELECT *
    FROM (
        SELECT
            s.pengajuan_id,
            s.role_id,
            s.kegiatan,
            mr1.ur_ref AS role,
            mr2.ur_ref AS status_terbaru,
            s.kd_status,
            s.unit_kerja_id,
            s.jabatan_id,
            s.flag_action,
            s.start_status,
            s.end_status,
            s.view_only,
            s.jenis_user_id,
            mr3.ur_ref AS ur_jenis_user_id,
            s.status_id,

            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn,

            CASE
                WHEN (
                    NOT EXISTS (
                        SELECT 1
                        FROM d_status_pengajuan x
                        WHERE x.pengajuan_id = s.pengajuan_id
                          AND x.unit_kerja_id = s.unit_kerja_id
                          AND x.jenis_user_id != '1'
                    )
                )
                THEN 'VR'

                WHEN (
                    EXISTS (
                        SELECT 1
                        FROM d_status_pengajuan x
                        WHERE x.pengajuan_id = s.pengajuan_id
                          AND x.unit_kerja_id = s.unit_kerja_id
                          AND x.jenis_user_id != '1'
                          AND x.kd_status IN ('VR')
                    )
                )
                THEN 'VR'

                WHEN (
                    EXISTS (
                        SELECT 1
                        FROM d_status_pengajuan x
                        WHERE x.pengajuan_id = s.pengajuan_id
                          AND x.unit_kerja_id = s.unit_kerja_id
                          AND x.jenis_user_id != '1'
                          AND x.kd_status IN ('UR')
                    )
                )
                THEN 'UR'

                ELSE NULL
            END AS status_verifikasi

        FROM d_status_pengajuan s

        LEFT JOIN m_referensi mr1
            ON mr1.kd_ref = s.role_id
            AND mr1.jns_ref = 'role_id'

        LEFT JOIN m_referensi mr2
            ON mr2.kd_ref = s.kd_status
            AND mr2.jns_ref = 'kd_status'

        LEFT JOIN m_referensi mr3
            ON mr3.kd_ref = s.jenis_user_id
            AND mr3.jns_ref = 'jenis_user_id'

        WHERE
            s.flag_show = 'Y'
            AND s.view_only = 'T'

        ORDER BY s.no_urut DESC
    ) x

    WHERE rn = 1
)

SELECT
    a.*,

    TO_CHAR(
        a.tgl_pembayaran,
        'DD/MM/YYYY'
    ) AS tgl_pembayaran_pengajuan,

    TO_CHAR(
        a.created_at,
        'DD/MM/YYYY HH24:MI:SS'
    ) AS tgl_pengajuan,

    v.nama_vendor,

    mr1.ur_ref AS jenis_biaya,
    mr1.sub_kd_ref,

    mu.nip AS nik_pemohon,
    mu.nama AS nama_pemohon,

    mru.jabatan_id,
    mr2.ur_ref AS jabatan,

    mru.cabang_id,
    mr3.ur_ref AS cabang,

    sp.kegiatan AS status_kegiatan,
    sp.role AS status_unit,
    sp.role_id AS status_unit_role,
    sp.status_terbaru AS status_pengajuan,
    sp.unit_kerja_id AS status_unit_kerja_id,
    mr4.ur_ref AS status_unit_kerja,
    sp.jabatan_id AS status_jabatan_id,
    sp.jenis_user_id AS status_jenis_user_id,
    sp.ur_jenis_user_id AS status_ur_jenis_user_id,
    sp.jabatan_id AS status_jabatan_id,
    sp.status_verifikasi,
    sp.status_id,
    sp.kd_status,

    CASE
        WHEN sp.kd_status = 'S2'
             AND (
                 SELECT dss.status_id
                 FROM d_status_pengajuan dss
                 WHERE dss.pengajuan_id = a.pengajuan_id
                 ORDER BY dss.no_urut DESC
                 LIMIT 1
             ) = sp.status_id
        THEN '1'
        ELSE '0'
    END AS status_selesai,

    CASE
        WHEN sp.kd_status = 'S2'
             AND (
                 SELECT dss.status_id
                 FROM d_status_pengajuan dss
                 WHERE dss.pengajuan_id = a.pengajuan_id
                 ORDER BY dss.no_urut DESC
                 LIMIT 1
             ) = sp.status_id
        THEN CONCAT(
            EXTRACT(
                DAY FROM AGE(
                    sp.end_status,
                    a.created_at
                )
            ),
            ' Hari ',
            EXTRACT(
                HOUR FROM AGE(
                    sp.end_status,
                    a.created_at
                )
            ),
            ' Jam'
        )
        ELSE CONCAT(
            EXTRACT(
                DAY FROM AGE(
                    COALESCE(sp.end_status, NOW()),
                    a.created_at
                )
            ),
            ' Hari ',
            EXTRACT(
                HOUR FROM AGE(
                    COALESCE(sp.end_status, NOW()),
                    a.created_at
                )
            ),
            ' Jam'
        )
    END AS sla_pengajuan,

    CASE
        WHEN sp.kd_status = 'S2'
             AND (
                 SELECT dss.status_id
                 FROM d_status_pengajuan dss
                 WHERE dss.pengajuan_id = a.pengajuan_id
                 ORDER BY dss.no_urut DESC
                 LIMIT 1
             ) = sp.status_id
        THEN ROUND(
            EXTRACT(
                EPOCH FROM (
                    sp.end_status - a.created_at
                )
            ) / 86400,
            1
        )
        ELSE ROUND(
            EXTRACT(
                EPOCH FROM (
                    COALESCE(sp.end_status, NOW())
                    - a.created_at
                )
            ) / 86400,
            1
        )
    END AS cond_sla

FROM pengajuan_sla ps

JOIN d_pengajuan a
    ON a.pengajuan_id = ps.pengajuan_id

LEFT JOIN m_user mu
    ON a.pemohon_id = mu.user_id

LEFT JOIN m_role_user mru
    ON mru.role_user_id = a.role_pemohon_id

LEFT JOIN m_referensi mr1
    ON mr1.kd_ref = a.jenis_biaya_id
    AND mr1.jns_ref = 'jenis_biaya_id'

LEFT JOIN m_referensi mr2
    ON mr2.kd_ref = mru.jabatan_id
    AND mr2.jns_ref = 'jabatan_id'

LEFT JOIN m_referensi mr3
    ON mr3.kd_ref = mru.cabang_id
    AND mr3.jns_ref = 'cabang_id'

LEFT JOIN status_pengajuan sp
    ON sp.pengajuan_id = a.pengajuan_id

LEFT JOIN m_referensi mr4
    ON mr4.kd_ref = sp.unit_kerja_id
    AND mr4.jns_ref = 'unit_kerja_id'

LEFT JOIN m_vendor v
    ON v.vendor_id = a.vendor_id

WHERE
    a.flag_aktif = 'Y'
    :condSLA;`

query.countListAllPengajuan = `
WITH status_pengajuan AS (
SELECT *
    FROM (
        SELECT
            s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.unit_kerja_id, s.jabatan_id, s.flag_action, s.start_status, s.end_status,
            s.view_only, s.jenis_user_id, mr3.ur_ref AS ur_jenis_user_id, s.status_id,
            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn,
            CASE
                            WHEN
                                (
                                    NOT EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                    )
                                )
                            THEN 'VR' 
                            WHEN
                                (
                                    EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('VR')
                                    )
                                )
                            THEN 'VR' 
                            WHEN
                                (
                                    EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('UR')
                                    )
                                )
                            THEN 'UR' 
                            ELSE null
                        END AS status_verifikasi
        FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' left join m_referensi mr3 ON mr3.kd_ref = s.jenis_user_id and mr3.jns_ref = 'jenis_user_id'
        WHERE s.flag_show = 'Y' AND s.view_only = 'T' order by s.no_urut DESC
    ) x
    WHERE rn = 1
),
sla_pengajuan AS (
SELECT 
    SUM(ds.sla) AS sla, ds.pengajuan_id 
FROM d_status_pengajuan ds 
GROUP BY ds.pengajuan_id
)
SELECT 
   COUNT(DISTINCT a.pengajuan_id) AS "total_data",
    (COUNT(DISTINCT a.pengajuan_id) / :limit) + 1 AS "total_halaman",
    :limit AS "limit" 
FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
left join m_role_user mru ON mru.role_user_id = a.role_pemohon_id 
left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
left join m_referensi mr2 ON mr2.kd_ref = mru.jabatan_id and mr2.jns_ref = 'jabatan_id' 
left join m_referensi mr3 ON mr3.kd_ref = mru.cabang_id and mr3.jns_ref = 'cabang_id' 
left join status_pengajuan sp ON sp.pengajuan_id = a.pengajuan_id 
left join m_referensi mr4 ON mr4.kd_ref = sp.unit_kerja_id and mr4.jns_ref = 'unit_kerja_id' 
left join m_vendor v on v.vendor_id = a.vendor_id 
left join sla_pengajuan slp ON slp.pengajuan_id = a.pengajuan_id 
WHERE a.flag_aktif = 'Y' :cabang :bulan :condition;`

// query.countListAllPengajuanDashboard = `
// WITH status_pengajuan AS (
// SELECT *
//     FROM (
//         SELECT
//             s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.unit_kerja_id, s.jabatan_id, s.flag_action, s.start_status, s.end_status,
//             s.view_only, s.jenis_user_id, mr3.ur_ref AS ur_jenis_user_id, s.status_id,
//             ROW_NUMBER() OVER (
//                 PARTITION BY s.pengajuan_id
//                 ORDER BY s.no_urut DESC
//             ) AS rn,
//             CASE
//                             WHEN
//                                 (
//                                     NOT EXISTS (
//                                         SELECT 1
//                                         FROM d_status_pengajuan x
//                                         WHERE x.pengajuan_id = s.pengajuan_id
//                                         AND x.unit_kerja_id = s.unit_kerja_id
//                                         AND x.jenis_user_id != '1'
//                                     )
//                                 )
//                             THEN 'VR' 
//                             WHEN
//                                 (
//                                     EXISTS (
//                                         SELECT 1
//                                         FROM d_status_pengajuan x
//                                         WHERE x.pengajuan_id = s.pengajuan_id
//                                         AND x.unit_kerja_id = s.unit_kerja_id
//                                         AND x.jenis_user_id != '1'
//                                         AND x.kd_status IN ('VR')
//                                     )
//                                 )
//                             THEN 'VR' 
//                             WHEN
//                                 (
//                                     EXISTS (
//                                         SELECT 1
//                                         FROM d_status_pengajuan x
//                                         WHERE x.pengajuan_id = s.pengajuan_id
//                                         AND x.unit_kerja_id = s.unit_kerja_id
//                                         AND x.jenis_user_id != '1'
//                                         AND x.kd_status IN ('UR')
//                                     )
//                                 )
//                             THEN 'UR' 
//                             ELSE null
//                         END AS status_verifikasi
//         FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' left join m_referensi mr3 ON mr3.kd_ref = s.jenis_user_id and mr3.jns_ref = 'jenis_user_id'
//         WHERE s.flag_show = 'Y' AND s.view_only = 'T' order by s.no_urut DESC
//     ) x
//     WHERE rn = 1
// ),
// sla_pengajuan AS (
// SELECT 
//     SUM(ds.sla) AS sla, ds.pengajuan_id 
// FROM d_status_pengajuan ds 
// GROUP BY ds.pengajuan_id
// ),
// sla_detail AS (
//     SELECT
//         a.pengajuan_id,
//         a.target_sla,

//         GREATEST(
//             (
//                 SELECT COUNT(*)
//                 FROM generate_series(
//                     DATE(a.start_status),
//                     DATE(COALESCE(a.end_status, CURRENT_DATE)),
//                     INTERVAL '1 day'
//                 ) AS g(hari)
//                 WHERE
//                     -- Senin - Jumat
//                     EXTRACT(ISODOW FROM g.hari) < 6

//                     -- Tidak termasuk hari libur
//                     AND NOT EXISTS (
//                         SELECT 1
//                         FROM m_hari_libur h
//                         WHERE h.tanggal = DATE(g.hari)
//                     )
//             ) - 1,
//             0
//         ) AS sla_hari_kerja

//     FROM d_status_pengajuan a
//     JOIN d_pengajuan b
//         ON b.pengajuan_id = a.pengajuan_id

//     WHERE
//         a.start_status IS NOT NULL
//         AND b.flag_aktif = 'Y' 
//         AND a.role_id NOT IN ('RL01', 'RL02')
//         AND a.view_only = 'T'
//         AND a.jenis_user_id = '1'
//         AND a.unit_id IS NOT NULL
// ),
// pengajuan_sla AS (
//     SELECT
//         pengajuan_id,
//         MAX(
//             CASE
//                 WHEN sla_hari_kerja > target_sla THEN 1
//                 ELSE 0
//             END
//         ) AS is_over
//     FROM sla_detail
//     GROUP BY pengajuan_id
// )
// SELECT 
//    COUNT(DISTINCT a.pengajuan_id) AS "total_data",
//     CEIL(COUNT(DISTINCT a.pengajuan_id)::numeric / :limit) AS "total_halaman",
//     :limit AS "limit" 
// FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
// left join m_role_user mru ON mru.role_user_id = a.role_pemohon_id
// left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
// left join m_referensi mr2 ON mr2.kd_ref = mru.jabatan_id and mr2.jns_ref = 'jabatan_id' 
// left join m_referensi mr3 ON mr3.kd_ref = mru.cabang_id and mr3.jns_ref = 'cabang_id' 
// left join status_pengajuan sp ON sp.pengajuan_id = a.pengajuan_id 
// left join m_referensi mr4 ON mr4.kd_ref = sp.unit_kerja_id and mr4.jns_ref = 'unit_kerja_id' 
// left join m_vendor v on v.vendor_id = a.vendor_id 
// left join sla_pengajuan slp ON slp.pengajuan_id = a.pengajuan_id 
// left join pengajuan_sla ps ON ps.pengajuan_id = a.pengajuan_id 
// WHERE a.flag_aktif = 'Y' :cabang :condition;`
query.countListAllPengajuanDashboard = `
WITH status_pengajuan AS (
    SELECT *
    FROM (
        SELECT
            s.pengajuan_id,
            s.role_id,
            s.kegiatan,
            mr1.ur_ref AS role,
            mr2.ur_ref AS status_terbaru,
            s.kd_status,
            s.unit_kerja_id,
            s.jabatan_id,
            s.flag_action,
            s.start_status,
            s.end_status,
            s.view_only,
            s.jenis_user_id,
            mr3.ur_ref AS ur_jenis_user_id,
            s.status_id,

            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn,

            CASE
                WHEN (
                    NOT EXISTS (
                        SELECT 1
                        FROM d_status_pengajuan x
                        WHERE x.pengajuan_id = s.pengajuan_id
                          AND x.unit_kerja_id = s.unit_kerja_id
                          AND x.jenis_user_id != '1'
                    )
                )
                THEN 'VR'

                WHEN (
                    EXISTS (
                        SELECT 1
                        FROM d_status_pengajuan x
                        WHERE x.pengajuan_id = s.pengajuan_id
                          AND x.unit_kerja_id = s.unit_kerja_id
                          AND x.jenis_user_id != '1'
                          AND x.kd_status IN ('VR')
                    )
                )
                THEN 'VR'

                WHEN (
                    EXISTS (
                        SELECT 1
                        FROM d_status_pengajuan x
                        WHERE x.pengajuan_id = s.pengajuan_id
                          AND x.unit_kerja_id = s.unit_kerja_id
                          AND x.jenis_user_id != '1'
                          AND x.kd_status IN ('UR')
                    )
                )
                THEN 'UR'

                ELSE NULL
            END AS status_verifikasi

        FROM d_status_pengajuan s

        LEFT JOIN m_referensi mr1
            ON mr1.kd_ref = s.role_id
            AND mr1.jns_ref = 'role_id'

        LEFT JOIN m_referensi mr2
            ON mr2.kd_ref = s.kd_status
            AND mr2.jns_ref = 'kd_status'

        LEFT JOIN m_referensi mr3
            ON mr3.kd_ref = s.jenis_user_id
            AND mr3.jns_ref = 'jenis_user_id'

        WHERE
            s.flag_show = 'Y'
            AND s.view_only = 'T'

        ORDER BY s.no_urut DESC
    ) x
    WHERE rn = 1
),

sla_pengajuan AS (
    SELECT
        SUM(ds.sla) AS sla,
        ds.pengajuan_id
    FROM d_status_pengajuan ds
    GROUP BY ds.pengajuan_id
),

/*
 * Ambil START, END dan TARGET SLA berdasarkan prioritas:
 *
 * START STATUS
 *   1. jenis_user_id = 2
 *   2. jika tidak ada, jenis_user_id = 1
 *
 * END STATUS
 *   selalu jenis_user_id = 1
 *
 * TARGET SLA
 *   selalu jenis_user_id = 1
 */
status_prioritas AS (
    SELECT
        d.pengajuan_id,
        d.role_id,
        d.unit_id,

        /*
         * START STATUS
         * Prioritas jenis_user_id = 2
         * Jika tidak ada, gunakan jenis_user_id = 1
         */
        COALESCE(
            MAX(
                CASE
                    WHEN d.jenis_user_id = '2'
                        THEN d.start_status
                END
            ),
            MAX(
                CASE
                    WHEN d.jenis_user_id = '1'
                        THEN d.start_status
                END
            )
        ) AS start_status,

        /*
         * END STATUS
         * Selalu jenis_user_id = 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.end_status
            END
        ) AS end_status,

        /*
         * TARGET SLA
         * Selalu jenis_user_id = 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.target_sla
            END
        ) AS target_sla

    FROM d_status_pengajuan d

    LEFT JOIN d_pengajuan b
        ON b.pengajuan_id = d.pengajuan_id

    WHERE
        d.start_status IS NOT NULL
        AND d.role_id NOT IN ('RL01', 'RL02')
        AND d.view_only = 'T'
        AND d.jenis_user_id IN ('1', '2')
        AND d.unit_id IS NOT NULL
        AND b.flag_aktif = 'Y'

    GROUP BY
        d.pengajuan_id,
        d.role_id,
        d.unit_id
),

sla_detail AS (
    SELECT
        d.pengajuan_id,
        d.target_sla,

        GREATEST(
            (
                SELECT COUNT(*)
                FROM generate_series(
                    DATE(d.start_status),
                    DATE(
                        COALESCE(
                            d.end_status,
                            CURRENT_DATE
                        )
                    ),
                    INTERVAL '1 day'
                ) AS g(hari)

                WHERE
                    -- Senin - Jumat
                    EXTRACT(ISODOW FROM g.hari) < 6

                    -- Tidak termasuk hari libur
                    AND NOT EXISTS (
                        SELECT 1
                        FROM m_hari_libur h
                        WHERE h.tanggal = DATE(g.hari)
                    )
            ) - 1,
            0
        ) AS sla_hari_kerja

    FROM status_prioritas d
),

pengajuan_sla AS (
    SELECT
        pengajuan_id,

        MAX(
            CASE
                WHEN sla_hari_kerja > target_sla
                    THEN 1
                ELSE 0
            END
        ) AS is_over

    FROM sla_detail

    GROUP BY
        pengajuan_id
)

SELECT
    COUNT(DISTINCT a.pengajuan_id) AS "total_data",

    CEIL(
        COUNT(DISTINCT a.pengajuan_id)::numeric / :limit
    ) AS "total_halaman",

    :limit AS "limit"

FROM d_pengajuan a

LEFT JOIN m_user mu
    ON a.pemohon_id = mu.user_id

LEFT JOIN m_role_user mru
    ON mru.role_user_id = a.role_pemohon_id

LEFT JOIN m_referensi mr1
    ON mr1.kd_ref = a.jenis_biaya_id
    AND mr1.jns_ref = 'jenis_biaya_id'

LEFT JOIN m_referensi mr2
    ON mr2.kd_ref = mru.jabatan_id
    AND mr2.jns_ref = 'jabatan_id'

LEFT JOIN m_referensi mr3
    ON mr3.kd_ref = mru.cabang_id
    AND mr3.jns_ref = 'cabang_id'

LEFT JOIN status_pengajuan sp
    ON sp.pengajuan_id = a.pengajuan_id

LEFT JOIN m_referensi mr4
    ON mr4.kd_ref = sp.unit_kerja_id
    AND mr4.jns_ref = 'unit_kerja_id'

LEFT JOIN m_vendor v
    ON v.vendor_id = a.vendor_id

LEFT JOIN sla_pengajuan slp
    ON slp.pengajuan_id = a.pengajuan_id

LEFT JOIN pengajuan_sla ps
    ON ps.pengajuan_id = a.pengajuan_id

WHERE
    a.flag_aktif = 'Y'
    :cabang
    :condition;
`;

query.countListAllPengajuanSLAPerformance = `
WITH status_prioritas AS (
    SELECT
        d.pengajuan_id,
        d.role_id,
        d.unit_id,

        /*
         * START STATUS
         * Prioritas jenis_user_id = 2
         * Jika tidak ada, gunakan jenis_user_id = 1
         */
        COALESCE(
            MAX(
                CASE
                    WHEN d.jenis_user_id = '2'
                        THEN d.start_status
                END
            ),
            MAX(
                CASE
                    WHEN d.jenis_user_id = '1'
                        THEN d.start_status
                END
            )
        ) AS start_status,

        /*
         * END STATUS
         * Selalu ambil dari jenis_user_id = 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.end_status
            END
        ) AS end_status,

        /*
         * TARGET SLA
         * Selalu ambil dari jenis_user_id = 1
         */
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.target_sla
            END
        ) AS target_sla

    FROM d_status_pengajuan d

    LEFT JOIN d_pengajuan b
        ON b.pengajuan_id = d.pengajuan_id

    WHERE
        d.start_status IS NOT NULL
        AND d.view_only = 'T'
        AND d.jenis_user_id IN ('1', '2')
        AND d.unit_id IS NOT NULL
        AND b.flag_aktif = 'Y'
        AND d.role_id NOT IN ('RL01', 'RL02')
        :condition

    GROUP BY
        d.pengajuan_id,
        d.role_id,
        d.unit_id
),

sla_detail AS (
    SELECT
        d.pengajuan_id,
        d.role_id,
        d.unit_id,
        d.target_sla,

        GREATEST(
            (
                SELECT COUNT(*)
                FROM generate_series(
                    DATE(d.start_status),
                    DATE(
                        COALESCE(
                            d.end_status,
                            CURRENT_DATE
                        )
                    ),
                    INTERVAL '1 day'
                ) AS g(hari)

                WHERE
                    -- Senin - Jumat
                    EXTRACT(ISODOW FROM g.hari) < 6

                    -- Tidak termasuk hari libur
                    AND NOT EXISTS (
                        SELECT 1
                        FROM m_hari_libur h
                        WHERE h.tanggal = DATE(g.hari)
                    )
            ) - 1,
            0
        ) AS sla_hari_kerja

    FROM status_prioritas d
),

pengajuan_sla AS (
    SELECT
        z.pengajuan_id,

        COUNT(*) AS task,

        SUM(
            CASE
                WHEN z.sla_hari_kerja <= z.target_sla
                    THEN 1
                ELSE 0
            END
        ) AS on_sla,

        SUM(
            CASE
                WHEN z.sla_hari_kerja > z.target_sla
                    THEN 1
                ELSE 0
            END
        ) AS over_sla,

        ROUND(
            SUM(
                CASE
                    WHEN z.sla_hari_kerja <= z.target_sla
                        THEN 1
                    ELSE 0
                END
            )::numeric
            / NULLIF(COUNT(*), 0) * 100,
            2
        ) AS kpi

    FROM sla_detail z

    GROUP BY
        z.pengajuan_id
)

SELECT
    COUNT(*) AS "total_data",

    CEIL(
        COUNT(*)::numeric / :limit
    ) AS "total_halaman",

    :limit AS "limit"

FROM pengajuan_sla ps

JOIN d_pengajuan a
    ON a.pengajuan_id = ps.pengajuan_id

WHERE
    a.flag_aktif = 'Y'
    :condSLA;`

query.getChildPengajuan = `
WITH status_pengajuan AS (
SELECT *
    FROM (
        SELECT
            s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.status_verifikasi, s.unit_kerja_id, s.jabatan_id, s.flag_action, 
            s.view_only,  
            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn
        FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' 
        WHERE s.flag_show = 'Y' order by s.no_urut DESC
    ) x
    WHERE rn = 1
),
-- show_pengajuan AS (
-- select s.pengajuan_id, s.role_id, s.flag_action, s.status_verifikasi, s.kd_status, s.no_urut, s.view_only, s.unit_kerja_id, s.jabatan_id 
-- from d_status_pengajuan s where s.flag_show IN ('Y', 'N')
-- :cte
-- ),
status_aktif AS (
SELECT *
    FROM (
select s.pengajuan_id, s.kd_status, s.flag_action, s.status_verifikasi, s.view_only, ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn from d_status_pengajuan s where s.no_urut is not null) x
    WHERE rn = 1
)
SELECT 
   ROW_NUMBER() OVER (:order) AS row_number,
   a.*,
   v.nama_vendor,
   mr1.ur_ref AS jenis_biaya,
   mr1.sub_kd_ref,
   mu.nip AS nik_pemohon, 
   mu.nama AS nama_pemohon,
   mru.jabatan_id,
   mr2.ur_ref AS jabatan,
   mru.cabang_id, 
   mr3.ur_ref AS cabang,
   sp.kegiatan AS status_kegiatan,
   sp.role AS status_unit,
   sp.role_id AS status_unit_role,
   sp.status_terbaru AS status_pengajuan,
   sp.unit_kerja_id AS status_unit_kerja_id,
   mr4.ur_ref AS status_unit_kerja,
   sp.jabatan_id AS status_jabatan_id,
   sp.status_verifikasi,
   -- sa.wajib_verifikasi AS user_wajib_verifikasi,
   sa.flag_action AS user_flag_action,
   sa.kd_status AS user_kd_status,
   sa.status_verifikasi AS user_status_verifikasi,
   sa.view_only AS user_view_only,
   -- sp.flag_action,
   -- sp.view_only,
   sp.kd_status
   -- shp.status_verifikasi,
   -- shp.flag_action, 
   -- shp.view_only
FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
left join m_role_user mru ON mru.role_user_id = a.role_pemohon_id
left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
left join m_referensi mr2 ON mr2.kd_ref = mru.jabatan_id and mr2.jns_ref = 'jabatan_id' 
left join m_referensi mr3 ON mr3.kd_ref = mru.cabang_id and mr3.jns_ref = 'cabang_id' 
left join status_pengajuan sp ON sp.pengajuan_id = a.pengajuan_id 
left join m_referensi mr4 ON mr4.kd_ref = sp.unit_kerja_id and mr4.jns_ref = 'unit_kerja_id' 
left join status_aktif sa ON sa.pengajuan_id = a.pengajuan_id 
-- left join show_pengajuan shp ON shp.pengajuan_id = a.pengajuan_id 
-- left join m_role_user mrx on mrx.role_id = shp.role_id and mrx.unit_kerja_id = shp.unit_kerja_id 
-- and mrx.jabatan_id = shp.jabatan_id 
left join m_vendor v on v.vendor_id = a.vendor_id 
WHERE a.parent_id = ':pengajuan_id' :order;`

// query.getChildPengajuan = `
// WITH status_pengajuan AS (
// SELECT *
//     FROM (
//         SELECT
//             s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.status_verifikasi,
//             ROW_NUMBER() OVER (
//                 PARTITION BY s.pengajuan_id
//                 ORDER BY s.no_urut DESC
//             ) AS rn
//         FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' 
//         WHERE s.flag_show = 'Y' order by s.no_urut DESC
//     ) x
//     WHERE rn = 1
// ),
// status_aktif AS (
// SELECT *
//     FROM (
// select s.pengajuan_id, s.kd_status, s.flag_action, s.status_verifikasi, s.view_only, s.wajib_verifikasi, ROW_NUMBER() OVER (
//                 PARTITION BY s.pengajuan_id
//                 ORDER BY s.no_urut DESC
//             ) AS rn from d_status_pengajuan s where s.no_urut is not null :condJabatanId) x
//     WHERE rn = 1
// )
// -- show_pengajuan AS (
// -- select s.pengajuan_id, s.role_id, s.flag_action, s.status_verifikasi, s.kd_status, s.no_urut, s.unit_kerja_id, s.jabatan_id, s.view_only 
// -- from d_status_pengajuan s where s.flag_show IN ('Y', 'N') :cte
// -- )
// SELECT 
//    a.*,
//    v.nama_vendor,
//    mr1.ur_ref AS jenis_biaya,
//    mr1.sub_kd_ref,
//    mu.nip AS nik_pemohon, 
//    mu.nama AS nama_pemohon,
//    mru.jabatan_id,
//    mr2.ur_ref AS jabatan,
//    mru.cabang_id, 
//    mr3.ur_ref AS cabang,
//    mr4.ur_ref AS status_unit_kerja,
//    sp.kegiatan AS status_kegiatan,
//    sp.role AS status_unit,
//    sp.role_id AS status_unit_role,
//    sp.status_terbaru AS status_pengajuan,
//    sp.kd_status
//    -- shp.status_verifikasi,
//    -- shp.flag_action 
// FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
// left join m_role_user mru On mru.role_user_id = a.role_pemohon_id
// left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
// left join m_referensi mr2 ON mr2.kd_ref = mru.jabatan_id and mr2.jns_ref = 'jabatan_id' 
// left join m_referensi mr3 ON mr3.kd_ref = mru.cabang_id and mr3.jns_ref = 'cabang_id' 
// left join status_pengajuan sp ON sp.pengajuan_id = a.pengajuan_id 
// left join m_referensi mr4 ON mr4.kd_ref = mru.unit_kerja_id and mr4.jns_ref = 'unit_kerja_id' 
// left join status_aktif sa ON sa.pengajuan_id = a.pengajuan_id 
// -- left join show_pengajuan shp ON shp.pengajuan_id = a.pengajuan_id 
// -- left join m_role_user mrx on mrx.role_id = shp.role_id and mrx.unit_kerja_id = shp.unit_kerja_id 
// -- and mrx.jabatan_id = shp.jabatan_id 
// left join m_vendor v on v.vendor_id = a.vendor_id 
// WHERE a.parent_id = ':pengajuan_id' :condition :condSearch;`

// query.countListPengajuan = `
// WITH status_pengajuan AS (
// SELECT *
//     FROM (
//         SELECT
//             s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.status_verifikasi,
//             ROW_NUMBER() OVER (
//                 PARTITION BY s.pengajuan_id
//                 ORDER BY s.date_status DESC
//             ) AS rn
//         FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' 
//         WHERE s.flag_show = 'Y' order by s.date_status DESC
//     ) x
//     WHERE rn = 1
// ),
// show_pengajuan AS (
// select s.pengajuan_id, s.role_id, s.flag_action, s.status_verifikasi, s.kd_status, s.no_urut, s.unit_kerja_id, s.jabatan_id, s.view_only 
// from d_status_pengajuan s where s.flag_show IN ('Y', 'N') :cte
// )
// SELECT 
//    COUNT(a.pengajuan_id) AS "total_data",
//    (COUNT(a.pengajuan_id) / :limit) + 1 AS "total_halaman",
//    :limit AS "limit" 
// FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
// left join m_role_user mru On mru.role_user_id = a.role_pemohon_id
// left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
// left join m_referensi mr2 ON mr2.kd_ref = mru.jabatan_id and mr2.jns_ref = 'jabatan_id' 
// left join m_referensi mr3 ON mr3.kd_ref = mru.cabang_id and mr3.jns_ref = 'cabang_id' 
// left join status_pengajuan sp ON sp.pengajuan_id = a.pengajuan_id 
// left join show_pengajuan shp ON shp.pengajuan_id = a.pengajuan_id 
// left join m_role_user mrx on mrx.role_id = shp.role_id and mrx.unit_kerja_id = shp.unit_kerja_id 
// -- and mrx.jabatan_id = shp.jabatan_id 
// left join m_vendor v on v.vendor_id = a.vendor_id 
// WHERE a.flag_aktif = 'Y' :condition :condSearch`;
// query.countListPengajuan = `
// WITH status_pengajuan AS (
// SELECT *
//     FROM (
//         SELECT
//             s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.status_verifikasi, s.unit_kerja_id, s.jabatan_id, s.flag_action, 
//             s.view_only,  
//             ROW_NUMBER() OVER (
//                 PARTITION BY s.pengajuan_id
//                 ORDER BY s.date_status DESC
//             ) AS rn
//         FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' 
//         WHERE s.flag_show = 'Y' order by s.date_status DESC
//     ) x
//     WHERE rn = 1
// ),
// status_aktif AS (
// SELECT *
//     FROM (
// select s.pengajuan_id, s.kd_status, s.flag_action, s.status_verifikasi, s.view_only, ROW_NUMBER() OVER (
//                 PARTITION BY s.pengajuan_id
//                 ORDER BY s.no_urut DESC
//             ) AS rn from d_status_pengajuan s where s.no_urut is not null :condJabatanId) x
//     WHERE rn = 1
// ),
// -- show_pengajuan AS (
// -- select s.pengajuan_id, s.role_id, s.flag_action, s.status_verifikasi, s.kd_status, s.no_urut, s.view_only, s.unit_kerja_id, s.jabatan_id 
// -- from d_status_pengajuan s where s.flag_show IN ('Y', 'N')
// -- :cte
// -- ),
// status_history AS (
// SELECT *
//     FROM (
// select s.history_id, z.pengajuan_id, ROW_NUMBER() OVER (
//                 PARTITION BY s.history_id
//                 ORDER BY s.created_at DESC
//             ) AS rn from d_status_pengajuan_history s join d_status_pengajuan z on s.status_id = z.status_id where s.qrcode is not null and s.role_user_id = :role_user) x
//     WHERE rn = 1 LIMIT 1
// )
// SELECT 
//     COUNT(a.pengajuan_id) AS "total_data",
//     (COUNT(a.pengajuan_id) / :limit) + 1 AS "total_halaman",
//     :limit AS "limit" 
// FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
// left join status_history sh on sh.pengajuan_id = a.pengajuan_id 
// left join m_role_user mru ON mru.role_user_id = a.role_pemohon_id
// left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
// left join m_referensi mr2 ON mr2.kd_ref = mru.jabatan_id and mr2.jns_ref = 'jabatan_id' 
// left join m_referensi mr3 ON mr3.kd_ref = mru.cabang_id and mr3.jns_ref = 'cabang_id' 
// left join status_pengajuan sp ON sp.pengajuan_id = a.pengajuan_id 
// left join status_aktif sa ON sa.pengajuan_id = a.pengajuan_id 
// -- left join show_pengajuan shp ON shp.pengajuan_id = a.pengajuan_id 
// -- left join m_role_user mrx on mrx.role_id = shp.role_id and mrx.unit_kerja_id = shp.unit_kerja_id 
// -- and mrx.jabatan_id = shp.jabatan_id 
// left join m_vendor v on v.vendor_id = a.vendor_id 
// WHERE a.flag_aktif = 'Y' 
// and (select count(spp.status_id) from d_status_pengajuan spp 
// where spp.pengajuan_id = a.pengajuan_id :condRole) > 0
// :condition :condSearch`;
query.countListPengajuan = `
WITH status_pengajuan AS (
SELECT *
    FROM (
        SELECT
            s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.status_verifikasi, s.unit_kerja_id, s.jabatan_id, s.flag_action, 
            s.view_only,  
            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.date_status DESC
            ) AS rn
        FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' 
        WHERE s.flag_show = 'Y' AND s.view_only = 'T' order by s.date_status DESC
    ) x
    WHERE rn = 1
),
status_user AS (
SELECT *
    FROM (
select s.status_id, s.pengajuan_id, s.kd_status, s.flag_action, s.flag_show, s.view_only, s.unit_kerja_id, s.jenis_user_id, m1.ur_ref AS ur_jenis_user_id, s.role_id, s.jabatan_id, 
            CASE
                            WHEN
                                (
                                    NOT EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                    )
                                    OR EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('VR','UR')
                                    )
                                )
                            THEN 'Y'
                            ELSE 'T'
                        END AS status_verifikasi, 
                        ROW_NUMBER() OVER(
                            PARTITION BY s.pengajuan_id
                            ORDER BY s.no_urut DESC
                        ) rn 
            from d_status_pengajuan s left join m_referensi m1 on m1.kd_ref = s.jenis_user_id and m1.jns_ref = 'jenis_user_id') x :condSuperAdmin
),
status_history AS (
SELECT *
    FROM (
select s.history_id, z.pengajuan_id, ROW_NUMBER() OVER (
                PARTITION BY s.history_id
                ORDER BY s.created_at DESC
            ) AS rn from d_status_pengajuan_history s join d_status_pengajuan z on s.status_id = z.status_id where s.qrcode is not null and s.role_user_id = :role_user order by s.created_at desc) x
    WHERE rn = 1 LIMIT 1
)
SELECT 
   COUNT(DISTINCT a.pengajuan_id) AS "total_data",
    CEIL(COUNT(DISTINCT a.pengajuan_id)::numeric / :limit) AS "total_halaman",
    :limit AS "limit" 
FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
left join status_history sh on sh.pengajuan_id = a.pengajuan_id 
left join m_role_user mru ON mru.role_user_id = a.role_pemohon_id
left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
left join m_referensi mr2 ON mr2.kd_ref = mru.jabatan_id and mr2.jns_ref = 'jabatan_id' 
left join m_referensi mr3 ON mr3.kd_ref = mru.cabang_id and mr3.jns_ref = 'cabang_id' 
left join status_pengajuan sp ON sp.pengajuan_id = a.pengajuan_id 
left join m_referensi mr4 ON mr4.kd_ref = sp.unit_kerja_id and mr4.jns_ref = 'unit_kerja_id' 
left join status_user sa ON sa.pengajuan_id = a.pengajuan_id 
left join m_vendor v on v.vendor_id = a.vendor_id 
WHERE a.flag_aktif = 'Y' 
and EXISTS (
    SELECT 1
    FROM d_status_pengajuan spp
    WHERE spp.pengajuan_id = a.pengajuan_id
    :condRole
)
:condition :condSearch`;

query.countListPengajuanPriority = `
WITH status_pengajuan AS (
SELECT *
    FROM (
        SELECT
            s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.status_verifikasi, s.unit_kerja_id, s.jabatan_id, s.flag_action, 
            s.view_only,  
            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.date_status DESC
            ) AS rn
        FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' 
        WHERE s.flag_show = 'Y' AND s.view_only = 'T' order by s.date_status DESC
    ) x
    WHERE rn = 1
),
status_user AS (
SELECT *
    FROM (
select s.status_id, s.pengajuan_id, s.kd_status, s.flag_action, s.flag_show, s.view_only, s.unit_kerja_id, s.jenis_user_id, m1.ur_ref AS ur_jenis_user_id, s.role_id, s.jabatan_id, 
            CASE
                            WHEN
                                (
                                    NOT EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                    )
                                    OR EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('VR','UR')
                                    )
                                )
                            THEN 'Y'
                            ELSE 'T'
                        END AS status_verifikasi, 
                        ROW_NUMBER() OVER(
                            PARTITION BY s.pengajuan_id
                            ORDER BY s.no_urut DESC
                        ) rn 
            from d_status_pengajuan s left join m_referensi m1 on m1.kd_ref = s.jenis_user_id and m1.jns_ref = 'jenis_user_id') x :condSuperAdmin
),
status_history AS (
SELECT *
    FROM (
select s.history_id, z.pengajuan_id, ROW_NUMBER() OVER (
                PARTITION BY s.history_id
                ORDER BY s.created_at DESC
            ) AS rn from d_status_pengajuan_history s join d_status_pengajuan z on s.status_id = z.status_id where s.qrcode is not null and s.role_user_id = :role_user order by s.created_at desc) x
    WHERE rn = 1 LIMIT 1
)
SELECT 
   COUNT(DISTINCT a.pengajuan_id) AS "total_data",
    (COUNT(DISTINCT a.pengajuan_id) / :limit) + 1 AS "total_halaman",
    :limit AS "limit" 
FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
left join status_history sh on sh.pengajuan_id = a.pengajuan_id 
left join m_role_user mru ON mru.role_user_id = a.role_pemohon_id
left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
left join m_referensi mr2 ON mr2.kd_ref = mru.jabatan_id and mr2.jns_ref = 'jabatan_id' 
left join m_referensi mr3 ON mr3.kd_ref = mru.cabang_id and mr3.jns_ref = 'cabang_id' 
left join status_pengajuan sp ON sp.pengajuan_id = a.pengajuan_id 
left join m_referensi mr4 ON mr4.kd_ref = sp.unit_kerja_id and mr4.jns_ref = 'unit_kerja_id' 
left join status_user sa ON sa.pengajuan_id = a.pengajuan_id 
left join m_vendor v on v.vendor_id = a.vendor_id 
WHERE a.flag_aktif = 'Y' 
and EXISTS (
    SELECT 1
    FROM d_status_pengajuan spp
    WHERE spp.pengajuan_id = a.pengajuan_id
    :condRole
)
:condition :condSearch`;

query.getDetailPengajuan = `
WITH status_pengajuan AS (
SELECT *
    FROM (
        SELECT
            s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.no_urut, s.kd_status, s.status_verifikasi, s.date_status, s.notes, s.status_id, s.view_only,
            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn
        FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' 
        WHERE s.flag_show = 'Y' order by s.no_urut DESC
    ) x
    WHERE rn = 1
),
jenis_biaya_group AS (
    SELECT
        kd_ref,
        lower((string_to_array(ur_ref, ' '))[1]) AS kata1,
        lower((string_to_array(ur_ref, ' '))[2]) AS kata2
    FROM m_referensi
    WHERE jns_ref = 'jenis_biaya_id'
),
catatan_pengajuan AS (
    SELECT
        s.pengajuan_id,
        MAX(s.notes) AS has_notes
    FROM d_status_pengajuan s
    WHERE s.jenis_user_id != '1'
      :condRole
    GROUP BY s.pengajuan_id
),
status_history AS (
SELECT *
    FROM (
select s.history_id, z.pengajuan_id, s.catatan, ROW_NUMBER() OVER (
                PARTITION BY s.history_id
                ORDER BY s.created_at DESC
            ) AS rn from d_status_pengajuan_history s join d_status_pengajuan z on s.status_id = z.status_id where s.qrcode is not null and s.role_user_id = :role_user_id order by s.created_at desc) x
    WHERE rn = 1 LIMIT 1
)
SELECT
    a.*,
    v.nama_vendor,
    v.nama_vendor AS ur_vendor_id,
    mr1.ur_ref AS ur_jenis_biaya_id,
    v.npwp_vendor,
    mu.nip || ' - ' || mu.nama AS ur_pemohon_id,
    mu.nama AS nama_pemohon,
    mru.cabang_id,
    mr2.ur_ref AS ur_cabang_id,
    mru.jabatan_id,
    mr3.ur_ref AS ur_jabatan_id,
    mr33.ur_ref AS unit_kerja_pemohon,
    case when a.tipe_ppn = 'include' then
        'Include PPN' 
    else 'Exclude PPN' END AS ur_tipe_ppn,
    case when dsp.kd_status is NULL OR dsp.kd_status in ('T') 
        then 'Y' 
    else 'T' end AS canDelete,
    dsp.kd_status,
    TO_CHAR(dsp.date_status, 'DD/MM/YYYY HH24:MI:SS') AS date_status,
    dsp.notes,
    dsp.status_id,
    dsp.role_id,
    mr4.ur_ref AS ur_role_id,
    dsp.no_urut,
    dsp.kegiatan AS status_kegiatan,
    dsp.role AS status_unit,
    dsp.role_id AS status_unit_role,
    dsp.status_terbaru AS status_pengajuan,
    dsp.view_only,
    case when ((select no_urut from d_status_pengajuan where pengajuan_id = a.pengajuan_id and flag_action = 'Y' order by no_urut desc limit 1) = (select max(no_urut) from d_status_pengajuan where pengajuan_id = a.pengajuan_id limit 1)) then 'Y' 
    else 'T' end AS approval_terakhir,
    jbg.kata1,
    jbg.kata2, 
    COALESCE(
    cp.has_notes,
    'Role Anda Tidak Memiliki Verifikator Pada Pengajuan Ini'
    ) AS catatan_verifikator,
    sh.history_id,
    sh.catatan AS catatan_anda_sebelumnya,
    a.jenis_pajak_id 
FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
left join jenis_biaya_group jbg ON jbg.kd_ref = a.jenis_biaya_id 
left join m_role_user mru ON mru.role_user_id = a.role_pemohon_id 
left join status_pengajuan dsp ON dsp.pengajuan_id = a.pengajuan_id 
left join m_vendor v on v.vendor_id = a.vendor_id 
left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
left join m_referensi mr2 ON mr2.kd_ref = mru.cabang_id and mr2.jns_ref = 'cabang_id' 
left join m_referensi mr3 ON mr3.kd_ref = mru.jabatan_id and mr3.jns_ref = 'jabatan_id' 
left join m_referensi mr33 ON mr33.kd_ref = mru.unit_kerja_id and mr33.jns_ref = 'unit_kerja_id' 
left join m_referensi mr4 ON mr4.kd_ref = dsp.role_id and mr4.jns_ref = 'role_id' 
left join catatan_pengajuan cp ON cp.pengajuan_id = a.pengajuan_id 
left join status_history sh ON sh.pengajuan_id = a.pengajuan_id 
left join m_jenis_pajak mjp ON mjp.jenis_pajak_id = a.jenis_pajak_id 
WHERE
    a.pengajuan_id = :pengajuan_id`

query.getDetailPengajuanNoAuth = `
WITH status_pengajuan AS (
SELECT *
    FROM (
        SELECT
            s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.no_urut, s.kd_status, s.status_verifikasi, s.date_status, s.notes, s.status_id, s.view_only,
            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn
        FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' 
        WHERE s.flag_show = 'Y' order by s.no_urut DESC
    ) x
    WHERE rn = 1
),
jenis_biaya_group AS (
    SELECT
        kd_ref,
        lower((string_to_array(ur_ref, ' '))[1]) AS kata1,
        lower((string_to_array(ur_ref, ' '))[2]) AS kata2
    FROM m_referensi
    WHERE jns_ref = 'jenis_biaya_id'
)
SELECT
    a.*,
    v.nama_vendor,
    v.nama_vendor AS ur_vendor_id,
    mr1.ur_ref AS ur_jenis_biaya_id,
    v.npwp_vendor,
    mu.nip || ' - ' || mu.nama AS ur_pemohon_id,
    mu.nama AS nama_pemohon,
    mru.cabang_id,
    mr2.ur_ref AS ur_cabang_id,
    mru.jabatan_id,
    mr3.ur_ref AS ur_jabatan_id,
    case when a.tipe_ppn = 'include' then
        'Include PPN' 
    else 'Exclude PPN' END AS ur_tipe_ppn,
    case when dsp.kd_status is NULL OR dsp.kd_status in ('T') 
        then 'Y' 
    else 'T' end AS canDelete,
    dsp.kd_status,
    TO_CHAR(dsp.date_status, 'DD/MM/YYYY HH24:MI:SS') AS date_status,
    dsp.notes,
    dsp.status_id,
    dsp.role_id,
    mr4.ur_ref AS ur_role_id,
    dsp.no_urut,
    dsp.kegiatan AS status_kegiatan,
    dsp.role AS status_unit,
    dsp.role_id AS status_unit_role,
    dsp.status_terbaru AS status_pengajuan,
    dsp.view_only,
    case when ((select no_urut from d_status_pengajuan where pengajuan_id = a.pengajuan_id and flag_action = 'Y' order by no_urut desc limit 1) = (select max(no_urut) from d_status_pengajuan where pengajuan_id = a.pengajuan_id limit 1)) then 'Y' 
    else 'T' end AS approval_terakhir,
    jbg.kata1,
    jbg.kata2 
FROM d_pengajuan a left join m_user mu ON a.pemohon_id = mu.user_id 
left join jenis_biaya_group jbg ON jbg.kd_ref = a.jenis_biaya_id 
left join m_role_user mru ON mru.role_user_id = a.role_pemohon_id 
left join status_pengajuan dsp ON dsp.pengajuan_id = a.pengajuan_id 
left join m_vendor v on v.vendor_id = a.vendor_id 
left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
left join m_referensi mr2 ON mr2.kd_ref = mru.cabang_id and mr2.jns_ref = 'cabang_id' 
left join m_referensi mr3 ON mr3.kd_ref = mru.jabatan_id and mr3.jns_ref = 'jabatan_id' 
left join m_referensi mr4 ON mr4.kd_ref = dsp.role_id and mr4.jns_ref = 'role_id' 
WHERE
    a.pengajuan_id = :pengajuan_id`

query.getDetailJenisPajak = `
select 
    a.*,
    m1.ur_ref as ur_jenis_pph_id 
from m_jenis_pajak a left join m_referensi m1 on m1.kd_ref = a.jenis_pph_id and m1.jns_ref = 'jenis_pph_id' 
where a.jenis_pajak_id = :jenis_pajak_id;
`

query.getDetailVendor = `
select 
    a.* 
from m_vendor a 
where a.vendor_id = :vendor_id;
`

query.getDetailStatus = `
select 
    c.no_pengajuan,
    c.pengajuan_id,
    to_char(c.created_at, 'DD/MM/YYYY HH24:MI') AS tgl_pengajuan,
    d.nama AS nama_pemohon,
    mr1.ur_ref AS jabatan,
    mr2.ur_ref AS cabang,
    mr3.ur_ref AS jenis_biaya,
    c.no_invoice,
    c.no_faktur_pajak,
    c.no_voucher_sap,
    c.no_kasbon_sap,
    c.nominal_dpp,
    c.ppn,
    c.nominal_ppn,
    c.pph,
    c.nominal_pph,
    to_char(a.created_at, 'DD/MM/YYYY HH24:MI:SS') AS tanggal_aksi,
    a.created_by AS aktor_aksi,
    mr5.ur_ref AS unit_aksi,
    mr6.ur_ref AS unit_kerja_aksi,
    mr7.ur_ref AS user_jabatan_aksi,
    a.catatan AS catatan_aksi, 
    a.kd_status,
    mr4.ur_ref AS status,
    a.qrcode,
    v.nama_vendor,
    c.keterangan 
from d_status_pengajuan_history a 
left join d_status_pengajuan b ON b.status_id = a.status_id 
left join d_pengajuan c ON c.pengajuan_id = b.pengajuan_id 
left join m_user d on d.user_id = c.pemohon_id 
left join m_role_user e on e.role_user_id = c.role_pemohon_id 
left join m_vendor v on v.vendor_id = c.vendor_id 
left join m_referensi mr1 on mr1.kd_ref = e.jabatan_id and mr1.jns_ref = 'jabatan_id' 
left join m_referensi mr2 on mr2.kd_ref = e.cabang_id and mr2.jns_ref = 'cabang_id' 
left join m_referensi mr3 on mr3.kd_ref = c.jenis_biaya_id and mr3.jns_ref = 'jenis_biaya_id' 
left join m_referensi mr4 on mr4.kd_ref = a.kd_status and mr4.jns_ref = 'kd_status' 
left join m_role_user f on f.role_user_id = a.role_user_id 
left join m_referensi mr5 on mr5.kd_ref = f.role_id and mr5.jns_ref = 'role_id' 
left join m_referensi mr6 on mr6.kd_ref = f.unit_kerja_id and mr6.jns_ref = 'unit_kerja_id' 
left join m_referensi mr7 on mr7.kd_ref = f.jabatan_id and mr7.jns_ref = 'jabatan_id' 
where a.history_id = :status`

query.getDokumen = `
SELECT
    a.dokumen_id,
    a.nama_dokumen,
    CONCAT('${LINK_DOK}', a.url_file) AS url_file,
    TO_CHAR(a.created_at, 'DD/MM/YYYY HH24:MI:SS') AS created_at,
    split_part(a.created_by, ' - ', 1) AS jenis_user,
    split_part(a.created_by, ' - ', 2) AS created_by 
FROM d_pengajuan_dokumen a 
WHERE
    a.pengajuan_id = :pengajuan_id`

query.getDetailUser = `
SELECT
    a.user_id,
    a.username,
    a.nip,
    a.nama,
    a.tgl_lahir,
    a.email,
    a.tipe_user,
    a.flag_aktif,
    a.created_by,
    a.created_at,
    case when a.flag_aktif = 'Y' then 'Aktif' else 'Non Aktif' END AS ur_flag_aktif,
    m1.ur_ref AS ur_tipe_user 
FROM m_user a left join m_referensi m1 
    on m1.kd_ref = a.tipe_user and m1.jns_ref = 'tipe_user'
WHERE
    a.user_id = :user_id`

query.getRoleUser = `
SELECT
    a.*,
    m1.ur_ref AS ur_jabatan_id, 
    m2.ur_ref AS ur_cabang_id, 
    m3.ur_ref AS ur_role_id, 
    m4.ur_ref AS ur_unit_kerja_id,
    m5.ur_ref AS ur_role_atasan_id, 
    m6.ur_ref AS ur_unit_id,
    m7.ur_ref AS ur_jenis_user_id
FROM m_role_user a 
left join m_referensi m1 
    on m1.kd_ref = a.jabatan_id and m1.jns_ref = 'jabatan_id' 
left join m_referensi m2 
    on m2.kd_ref = a.cabang_id and m2.jns_ref = 'cabang_id' 
left join m_referensi m3 
    on m3.kd_ref = a.role_id and m3.jns_ref = 'role_id' 
left join m_referensi m4 
    on m4.kd_ref = a.unit_kerja_id and m4.jns_ref = 'unit_kerja_id' 
left join m_referensi m5 
    on m5.kd_ref = a.role_atasan_id and m5.jns_ref = 'role_id' 
left join m_referensi m6 
    on m6.kd_ref = a.unit_id and m6.jns_ref = 'unit_id' 
left join m_referensi m7 
    on m7.kd_ref = a.jenis_user_id and m7.jns_ref = 'jenis_user_id' 
WHERE
    a.user_id = :user_id order by a.created_at desc`

query.getCoaPengajuan = `
WITH budget_biaya AS (
SELECT 
    a.anggaran_id, 
    SUM(a.besar_budget) AS total 
FROM 
    d_penambahan_anggaran a 
GROUP BY a.anggaran_id
),
realisasi AS (
SELECT 
    a.anggaran_id, 
    SUM(a.nominal) AS total 
FROM 
    d_pemakaian_anggaran a 
GROUP BY a.anggaran_id
)
SELECT
    a.*,
    b.header_coa AS ur_coa_id,
    c.detail_coa AS ur_coa_detail_id,
    c.gl_account,
    da.anggaran_id,
    (COALESCE(bb.total, 0) - COALESCE(r.total, 0)) as sisa_anggaran 
FROM d_pengajuan_coa a left join m_coa b on b.coa_id = a.coa_id left join m_coa_detail c on c.coa_detail_id = a.coa_detail_id 
left join d_pengajuan dp on dp.pengajuan_id = a.pengajuan_id 
left join m_role_user mru on mru.role_user_id = dp.role_pembuat_id 
left join d_anggaran da on da.coa_detail_id = a.coa_detail_id and da.cabang_id = mru.cabang_id and da.bulan = TO_CHAR(dp.created_at, 'YYYY-MM') 
left join budget_biaya bb on bb.anggaran_id = da.anggaran_id 
left join realisasi r on r.anggaran_id = da.anggaran_id 
WHERE
    a.pengajuan_id = :pengajuan_id`

query.getUserStatus = `
select a.nip, a.nama 
from m_user a join m_role_user b on a.user_id = b.user_id 
where b.is_aktif = 'Y' :condition`

query.getStatusPenolakan = `
SELECT
    b.*,
    m1.ur_ref AS ur_role_id  
FROM d_status_pengajuan a join d_status_pengajuan_history b on a.status_id = b.status_id 
left join m_role_user mru on mru.role_user_id = b.role_user_id 
left join m_referensi m1 
    on m1.kd_ref = mru.role_id and m1.jns_ref = 'role_id' 
left join m_referensi m2 
    on m2.kd_ref = b.kd_status and m2.jns_ref = 'kd_status' 
left join m_referensi m3 
    on m3.kd_ref = mru.unit_kerja_id and m3.jns_ref = 'unit_kerja_id' 
left join m_referensi m4 
    on m4.kd_ref = mru.jabatan_id and m4.jns_ref = 'jabatan_id' 
WHERE
    a.pengajuan_id = :pengajuan_id AND b.kd_status = 'T'
ORDER BY b.created_at DESC LIMIT 1`

query.getStatusPengajuan = `
SELECT
    a.*,
    TO_CHAR(a.date_status, 'DD/MM/YYYY HH24:MI:SS') AS date_status,
    m1.ur_ref AS ur_role_id, 
    m2.ur_ref AS ur_kd_status_id,
    m3.ur_ref AS ur_unit_kerja_id, 
    m4.ur_ref AS ur_jabatan_id,
    CASE WHEN EXISTS (SELECT 1 
        FROM d_status_pengajuan z 
        WHERE z.pengajuan_id = a.pengajuan_id and 
        z.role_id = a.role_id and 
        z.unit_kerja_id = a.unit_kerja_id and z.flag_action = 'Y' 
    ) THEN 'Y' 
    ELSE 'T' END AS flag_action_unit 
FROM d_status_pengajuan a left join m_referensi m1 
    on m1.kd_ref = a.role_id and m1.jns_ref = 'role_id' 
left join m_referensi m2 
    on m2.kd_ref = a.kd_status and m2.jns_ref = 'kd_status' 
left join m_referensi m3 
    on m3.kd_ref = a.unit_kerja_id and m3.jns_ref = 'unit_kerja_id' 
left join m_referensi m4 
    on m4.kd_ref = a.jabatan_id and m4.jns_ref = 'jabatan_id' 
WHERE
    a.pengajuan_id = :pengajuan_id AND (a.jenis_user_id = '1') AND a.view_only IN ('T', 'YY')
ORDER BY a.no_urut ASC`
// OR (a.jenis_user_id != '1' AND a.unit_kerja_id = 'UK053')

query.getDataUser = `
select 
    a.nama, a.nip, a.user_id, a.tipe_user, b.role_user_id, b.cabang_id, b.jabatan_id, mr1.ur_ref AS ur_cabang_id, mr2.ur_ref AS ur_jabatan_id  
from m_user a join m_role_user b 
    ON b.user_id = a.user_id left join m_referensi mr1 ON mr1.kd_ref = b.cabang_id and mr1.jns_ref = 'cabang_id' 
    left join m_referensi mr2 ON mr2.kd_ref = b.jabatan_id and mr2.jns_ref = 'jabatan_id' where b.is_aktif = 'Y' 
    :condition`;

query.getListCoa = `
SELECT
    a.coa_id,
    a.header_coa,
    COALESCE(
        json_agg(
            json_build_object(
                'coa_detail_id', d.coa_detail_id,
                'gl_account', d.gl_account,
                'detail_coa', d.detail_coa
            )
        ) FILTER (WHERE d.coa_detail_id IS NOT NULL),
        '[]'::json
    ) AS detail
FROM m_coa a
LEFT JOIN m_coa_detail d
    ON d.coa_id = a.coa_id
WHERE UPPER(a.header_coa) LIKE UPPER(:keyword)
GROUP BY
    a.coa_id,
    a.header_coa
ORDER BY a.header_coa`;

query.getListCoaDetail = `
SELECT
    a.*,
    d.header_coa 
FROM m_coa_detail a
LEFT JOIN m_coa d
    ON d.coa_id = a.coa_id
WHERE 
    UPPER(a.detail_coa) LIKE UPPER(:keyword) 
    OR UPPER(a.gl_account) LIKE UPPER(:keyword) 
ORDER BY a.detail_coa`;

query.getListCoaDetailByCabang = `
WITH pemakaian AS (
SELECT SUM(x.nominal) AS total,
x.anggaran_id FROM d_pemakaian_anggaran x group by x.anggaran_id
),
penambahan AS (
SELECT SUM(x.besar_budget) AS total,
x.anggaran_id FROM d_penambahan_anggaran x group by x.anggaran_id
)
SELECT
    a.*,
    d.header_coa,
    da.*,
    TO_CHAR(TO_DATE(da.bulan, 'YYYY-MM'), 'MON YYYY') AS month,
    pmk.total AS total_pemakaian,
    pnm.total AS total_budget,
    COALESCE((COALESCE(pnm.total, 0) - COALESCE(pmk.total, 0)), 0) AS sisa_anggaran 
FROM d_anggaran da INNER JOIN m_coa_detail a 
ON da.coa_detail_id = a.coa_detail_id 
INNER JOIN m_coa d
    ON d.coa_id = a.coa_id 
LEFT JOIN pemakaian pmk ON pmk.anggaran_id = da.anggaran_id 
LEFT JOIN penambahan pnm ON pnm.anggaran_id = da.anggaran_id 
WHERE 
da.cabang_id = :cabang_id AND 
    UPPER(a.detail_coa) LIKE UPPER(:keyword) 
    OR UPPER(a.gl_account) LIKE UPPER(:keyword) 
ORDER BY a.detail_coa`;

// query.getListCoaDetailByDashboard = `
// WITH pemakaian AS (
// SELECT SUM(x.nominal) AS total,
// x.anggaran_id FROM d_pemakaian_anggaran x group by x.anggaran_id
// ),
// penambahan AS (
// SELECT SUM(x.besar_budget) AS total,
// x.anggaran_id FROM d_penambahan_anggaran x group by x.anggaran_id
// )
// SELECT
//     a.*,
//     d.header_coa,
//     da.*,
//     TO_CHAR(TO_DATE(da.bulan, 'YYYY-MM'), 'MON YYYY') AS month,
//     pmk.total AS total_pemakaian,
//     pnm.total AS total_budget,
//     COALESCE((pnm.total - pmk.total), 0) AS sisa_anggaran 
// FROM d_anggaran da INNER JOIN m_coa_detail a 
// ON da.coa_detail_id = a.coa_detail_id 
// INNER JOIN m_coa d
//     ON d.coa_id = a.coa_id 
// LEFT JOIN pemakaian pmk ON pmk.anggaran_id = da.anggaran_id 
// LEFT JOIN penambahan pnm ON pnm.anggaran_id = da.anggaran_id 
// WHERE 
// da.anggaran_id is not null :condition AND 
//     UPPER(a.detail_coa) LIKE UPPER(:keyword) 
//     OR UPPER(a.gl_account) LIKE UPPER(:keyword) 
// ORDER BY a.detail_coa`;

query.getListCoaDetailByDashboard = `
WITH pemakaian AS (
    SELECT
        anggaran_id,
        SUM(nominal) AS total
    FROM d_pemakaian_anggaran
    GROUP BY anggaran_id
),
penambahan AS (
    SELECT
        anggaran_id,
        SUM(besar_budget) AS total
    FROM d_penambahan_anggaran
    GROUP BY anggaran_id
)

SELECT
    c.coa_id,
    c.header_coa,

    COALESCE(SUM(pnm.total), 0) AS total_budget,

    COALESCE(SUM(pmk.total), 0) AS total_pemakaian,

    COALESCE(SUM(pnm.total), 0) -
    COALESCE(SUM(pmk.total), 0) AS sisa_anggaran

FROM m_coa c

INNER JOIN m_coa_detail d
    ON d.coa_id = c.coa_id

INNER JOIN d_anggaran a
    ON a.coa_detail_id = d.coa_detail_id

LEFT JOIN pemakaian pmk
    ON pmk.anggaran_id = a.anggaran_id

LEFT JOIN penambahan pnm
    ON pnm.anggaran_id = a.anggaran_id

WHERE
    a.anggaran_id IS NOT NULL
    :condition
    AND UPPER(c.header_coa) LIKE UPPER(:keyword)

GROUP BY
    c.coa_id,
    c.header_coa

ORDER BY
    c.header_coa
`;

query.getListCoaDetailDashboard = `
with pemakaian as (
select
	anggaran_id,
	SUM(nominal) as total
from
	d_pemakaian_anggaran 
WHERE to_anggaran_id is null 
group by
	anggaran_id
),
penambahan as (
select
	anggaran_id,
	SUM(besar_budget) as total
from
	d_penambahan_anggaran 
WHERE from_anggaran_id is null 
group by
	anggaran_id
)
select
	c.coa_id,
	c.header_coa,
	coalesce(SUM(pnm.total), 0) as total_budget,
	coalesce(SUM(pmk.total), 0) as total_pemakaian,
	coalesce(SUM(pnm.total), 0)
    -
    coalesce(SUM(pmk.total), 0)
    as sisa_anggaran
from
	m_coa c
left join m_coa_detail d
on
	d.coa_id = c.coa_id
left join d_anggaran a
on
	a.coa_detail_id = d.coa_detail_id
left join penambahan pnm
on
	pnm.anggaran_id = a.anggaran_id
left join pemakaian pmk
on
	pmk.anggaran_id = a.anggaran_id 
:condition 
where
	c.klasifikasi_coa_id = :klasifikasi_coa_id and d.gl_account != '12345678' 
group by
	c.coa_id,
	c.header_coa
order by
	c.header_coa`;

query.getListCoaKlasifikasiDashboard = `
WITH pemakaian AS (
    SELECT
        anggaran_id,
        SUM(nominal) AS total
    FROM d_pemakaian_anggaran 
    WHERE to_anggaran_id is null 
    GROUP BY anggaran_id
),
penambahan AS (
    SELECT
        anggaran_id,
        SUM(besar_budget) AS total
    FROM d_penambahan_anggaran 
    WHERE from_anggaran_id is null 
    GROUP BY anggaran_id
)
SELECT
    kc.klasifikasi_coa_id,
    kc.nama_klasifikasi,
    COALESCE(SUM(pnm.total),0) AS total_budget,
    COALESCE(SUM(pmk.total),0) AS total_pemakaian,
    COALESCE(SUM(pnm.total),0)
    -
    COALESCE(SUM(pmk.total),0) AS sisa_anggaran
FROM m_klasifikasi_coa kc
LEFT JOIN m_coa c
    ON c.klasifikasi_coa_id = kc.klasifikasi_coa_id
LEFT JOIN m_coa_detail d
    ON d.coa_id = c.coa_id
LEFT JOIN d_anggaran a
    ON a.coa_detail_id = d.coa_detail_id
LEFT JOIN penambahan pnm
    ON pnm.anggaran_id = a.anggaran_id
LEFT JOIN pemakaian pmk
    ON pmk.anggaran_id = a.anggaran_id
    :condition 
GROUP BY
    kc.klasifikasi_coa_id,
    kc.nama_klasifikasi
ORDER BY
    kc.nama_klasifikasi DESC;`;

query.getListUserManagement = `
SELECT
    mu.user_id,
    mu.username,
    mu.nama,
    mu.nip,
    mu.email,
    mu.tgl_lahir,
    mu.tipe_user,
    mu.flag_aktif,
    mu.created_at,
    mu.created_by,
    mu.updated_at,
    mu.updated_by,
    mru.role_user_id,
    mru.role_id,
    mru.cabang_id,
    mru.jabatan_id,
    mru.unit_kerja_id,
    mru.jenis_user_id,
    mru.is_aktif,
    mru.tgl_aktif_bekerja,
    mru.created_at AS role_created_at,
    mru.created_by AS role_created_by,
    mru.updated_at AS role_updated_at,
    mru.updated_by AS role_updated_by,
    m1.ur_ref AS jabatan,
    m2.ur_ref AS cabang,
    m3.ur_ref AS role,
    m4.ur_ref AS unit_kerja, 
    m5.ur_ref AS jenis_user 
FROM m_user mu
LEFT JOIN m_role_user mru
    ON mu.user_id = mru.user_id and mru.is_aktif = 'Y' 
left join m_referensi m1 
    on m1.kd_ref = mru.jabatan_id and m1.jns_ref = 'jabatan_id'
left join m_referensi m2 
    on m2.kd_ref = mru.cabang_id and m2.jns_ref = 'cabang_id' 
left join m_referensi m3 
    on m3.kd_ref = mru.role_id and m3.jns_ref = 'role_id' 
left join m_referensi m4 
    on m4.kd_ref = mru.unit_kerja_id and m4.jns_ref = 'unit_kerja_id' 
left join m_referensi m5 
    on m5.kd_ref = mru.jenis_user_id and m5.jns_ref = 'jenis_user_id'
where mu.flag_aktif is not null :condition 
:order 
OFFSET (:page - 1) * :limit 
FETCH NEXT :limit ROWS ONLY;
`

query.getListMasterApproval = `
SELECT
    a.jenis_biaya_id,
    a.unit_kerja_pemohon_id,
    a.jabatan_pemohon_id,
    case when substr(a.jenis_biaya_id,1,2) = 'KP' then 
        'Pusat' 
    else 'Cabang' end AS jenis_pengajuan,
    jb.ur_ref AS jenis_biaya,
    uk.ur_ref AS unit_kerja_pemohon,
    jp.ur_ref AS jabatan_pemohon,
    json_agg(
        json_build_object(
            'flow_id', a.flow_id,
            'no_urut', a.no_urut,
            'role_id', a.role_id,
            'role', rl.ur_ref,
            'unit_kerja_id', a.unit_kerja_id,
            'unit_kerja', uk2.ur_ref,
            'jabatan_id', a.jabatan_id,
            'jabatan', jb2.ur_ref,
            'kegiatan', a.kegiatan,
            'jenis_user_id', a.jenis_user_id,
            'jenis_user', ju.ur_ref,
            'view_only', a.view_only,
            'flag_aktif', a.flag_aktif
        )
        ORDER BY a.no_urut
    ) AS detail_data
FROM m_flow_approval a
LEFT JOIN m_referensi jb
    ON jb.kd_ref = a.jenis_biaya_id
   AND jb.jns_ref = 'jenis_biaya_id'
LEFT JOIN m_referensi uk
    ON uk.kd_ref = a.unit_kerja_pemohon_id
   AND uk.jns_ref = 'unit_kerja_id'
LEFT JOIN m_referensi jp
    ON jp.kd_ref = a.jabatan_pemohon_id
   AND jp.jns_ref = 'jabatan_id'
LEFT JOIN m_referensi uk2
    ON uk2.kd_ref = a.unit_kerja_id
   AND uk2.jns_ref = 'unit_kerja_id'
LEFT JOIN m_referensi jb2
    ON jb2.kd_ref = a.jabatan_id
   AND jb2.jns_ref = 'jabatan_id' 
LEFT JOIN m_referensi rl
    ON rl.kd_ref = a.role_id
   AND rl.jns_ref = 'role_id' 
LEFT JOIN m_referensi jpe 
    ON jpe.kd_ref = SUBSTR(a.jenis_biaya_id,1,2) 
    AND jpe.jns_ref = 'jenis_flow' 
LEFT JOIN m_referensi ju 
    ON ju.kd_ref = a.jenis_user_id 
    AND ju.jns_ref = 'jenis_user_id' 
WHERE a.flag_aktif IN ('Y','T') :condition
GROUP BY
    a.jenis_biaya_id,
    a.unit_kerja_pemohon_id,
    a.jabatan_pemohon_id,
    jb.ur_ref,
    uk.ur_ref,
    jp.ur_ref
:order 
OFFSET (:page - 1) * :limit 
FETCH NEXT :limit ROWS ONLY;
`

query.getListMasterData = `
SELECT
    a.* 
FROM m_referensi a 
WHERE a.flag_show IN ('Y') :condition 
:order 
OFFSET (:page - 1) * :limit 
FETCH NEXT :limit ROWS ONLY;
`

query.getListManajemenSession = `
SELECT
    a.*,
    TO_CHAR(a.created_at, 'DD/MM/YYYY HH24:MI:SS') AS waktu_login,
    TO_CHAR(a.jwt_expires_at, 'DD/MM/YYYY HH24:MI:SS') AS expired_session,
    b.nama  
FROM s_users a left join m_user b ON b.username = a.username 
WHERE a.s_id is not null :condition 
:order 
OFFSET (:page - 1) * :limit 
FETCH NEXT :limit ROWS ONLY;
`

query.getListJenisPajak = `
SELECT
    a.*,
    m1.ur_ref AS ur_jenis_pph_id 
FROM m_jenis_pajak a left join m_referensi m1 on m1.kd_ref = a.jenis_pph_id and m1.jns_ref = 'jenis_pph_id' 
WHERE a.kode_objek is not null :condition 
:order 
OFFSET (:page - 1) * :limit 
FETCH NEXT :limit ROWS ONLY;
`

query.getDataMasterApproval = `
SELECT
    a.jenis_biaya_id,
    a.unit_kerja_pemohon_id,
    a.jabatan_pemohon_id,
    case when substr(a.jenis_biaya_id,1,2) = 'KP' then 
        'Pusat' 
    else 'Cabang' end AS jenis_pengajuan,
    jb.ur_ref AS ur_jenis_biaya_id,
    uk.ur_ref AS ur_unit_kerja_pemohon_id,
    jp.ur_ref AS ur_jabatan_pemohon_id,
    json_agg(
        json_build_object(
            'flow_id', a.flow_id,
            'no_urut', a.no_urut,
            'role_id', a.role_id,
            'ur_role_id', rl.ur_ref,
            'unit_kerja_id', a.unit_kerja_id,
            'ur_unit_kerja_id', uk2.ur_ref,
            'jabatan_id', a.jabatan_id,
            'ur_jabatan_id', jb2.ur_ref,
            'kegiatan', a.kegiatan,
            'target_sla', a.target_sla,
            'jenis_user_id', a.jenis_user_id,
            'ur_jenis_user_id', ju.ur_ref,
            'view_only', a.view_only,
            'flag_aktif', a.flag_aktif
        )
        ORDER BY a.no_urut
    ) AS detail_data
FROM m_flow_approval a
LEFT JOIN m_referensi jb
    ON jb.kd_ref = a.jenis_biaya_id
   AND jb.jns_ref = 'jenis_biaya_id'
LEFT JOIN m_referensi uk
    ON uk.kd_ref = a.unit_kerja_pemohon_id
   AND uk.jns_ref = 'unit_kerja_id'
LEFT JOIN m_referensi jp
    ON jp.kd_ref = a.jabatan_pemohon_id
   AND jp.jns_ref = 'jabatan_id'
LEFT JOIN m_referensi uk2
    ON uk2.kd_ref = a.unit_kerja_id
   AND uk2.jns_ref = 'unit_kerja_id'
LEFT JOIN m_referensi jb2
    ON jb2.kd_ref = a.jabatan_id
   AND jb2.jns_ref = 'jabatan_id' 
LEFT JOIN m_referensi rl
    ON rl.kd_ref = a.role_id
   AND rl.jns_ref = 'role_id' 
LEFT JOIN m_referensi ju
    ON ju.kd_ref = a.jenis_user_id
   AND ju.jns_ref = 'jenis_user_id'
WHERE a.flag_aktif IN ('Y','T') AND a.view_only = 'T' AND a.jenis_user_id = '1' :jenis_biaya :unit_kerja :jabatan  
GROUP BY
    a.jenis_biaya_id,
    a.unit_kerja_pemohon_id,
    a.jabatan_pemohon_id,
    jb.ur_ref,
    uk.ur_ref,
    jp.ur_ref;
`

query.getDataMasterApprovalAll = `
SELECT
    a.jenis_biaya_id,
    a.unit_kerja_pemohon_id,
    a.jabatan_pemohon_id,
    case when substr(a.jenis_biaya_id,1,2) = 'KP' then 
        'Pusat' 
    else 'Cabang' end AS jenis_pengajuan,
    jb.ur_ref AS ur_jenis_biaya_id,
    uk.ur_ref AS ur_unit_kerja_pemohon_id,
    jp.ur_ref AS ur_jabatan_pemohon_id,
    json_agg(
        json_build_object(
            'flow_id', a.flow_id,
            'no_urut', a.no_urut,
            'role_id', a.role_id,
            'ur_role_id', rl.ur_ref,
            'unit_kerja_id', a.unit_kerja_id,
            'ur_unit_kerja_id', uk2.ur_ref,
            'jabatan_id', a.jabatan_id,
            'ur_jabatan_id', jb2.ur_ref,
            'kegiatan', a.kegiatan,
            'target_sla', a.target_sla,
            'jenis_user_id', a.jenis_user_id,
            'ur_jenis_user_id', ju.ur_ref,
            'view_only', a.view_only,
            'flag_aktif', a.flag_aktif
        )
        ORDER BY a.no_urut
    ) AS detail_data
FROM m_flow_approval a
LEFT JOIN m_referensi jb
    ON jb.kd_ref = a.jenis_biaya_id
   AND jb.jns_ref = 'jenis_biaya_id'
LEFT JOIN m_referensi uk
    ON uk.kd_ref = a.unit_kerja_pemohon_id
   AND uk.jns_ref = 'unit_kerja_id'
LEFT JOIN m_referensi jp
    ON jp.kd_ref = a.jabatan_pemohon_id
   AND jp.jns_ref = 'jabatan_id'
LEFT JOIN m_referensi uk2
    ON uk2.kd_ref = a.unit_kerja_id
   AND uk2.jns_ref = 'unit_kerja_id'
LEFT JOIN m_referensi jb2
    ON jb2.kd_ref = a.jabatan_id
   AND jb2.jns_ref = 'jabatan_id' 
LEFT JOIN m_referensi rl
    ON rl.kd_ref = a.role_id
   AND rl.jns_ref = 'role_id' 
LEFT JOIN m_referensi ju
    ON ju.kd_ref = a.jenis_user_id 
    AND ju.jns_ref = 'jenis_user_id'
WHERE a.flag_aktif IN ('Y','T') :jenis_biaya :unit_kerja :jabatan  
GROUP BY
    a.jenis_biaya_id,
    a.unit_kerja_pemohon_id,
    a.jabatan_pemohon_id,
    jb.ur_ref,
    uk.ur_ref,
    jp.ur_ref;
`

query.countListUserManagement = `
SELECT
    COUNT(DISTINCT mu.user_id) AS "total_data",
   (COUNT(DISTINCT mu.user_id) / :limit) + 1 AS "total_halaman",
   :limit AS "limit" 
FROM m_user mu
LEFT JOIN m_role_user mru
    ON mu.user_id = mru.user_id and mru.is_aktif = 'Y' 
left join m_referensi m1 
    on m1.kd_ref = mru.jabatan_id and m1.jns_ref = 'jabatan_id'
left join m_referensi m2 
    on m2.kd_ref = mru.cabang_id and m2.jns_ref = 'cabang_id' 
left join m_referensi m3 
    on m3.kd_ref = mru.role_id and m3.jns_ref = 'role_id' 
left join m_referensi m4 
    on m4.kd_ref = mru.unit_kerja_id and m4.jns_ref = 'unit_kerja_id' 
left join m_referensi m5 
    on m5.kd_ref = mru.jenis_user_id and m5.jns_ref = 'jenis_user_id'
where mu.flag_aktif is not null :condition;
`

query.countListMasterApproval = `
SELECT
    COUNT(*) AS total_data,
    CEIL(COUNT(*)::numeric / :limit) AS total_halaman,
    :limit AS limit
FROM (
    SELECT
        a.jenis_biaya_id,
        a.unit_kerja_pemohon_id,
        a.jabatan_pemohon_id
    FROM m_flow_approval a
    LEFT JOIN m_referensi jb
        ON jb.kd_ref = a.jenis_biaya_id
    AND jb.jns_ref = 'jenis_biaya_id'
    LEFT JOIN m_referensi uk
        ON uk.kd_ref = a.unit_kerja_pemohon_id
    AND uk.jns_ref = 'unit_kerja_id'
    LEFT JOIN m_referensi jp
        ON jp.kd_ref = a.jabatan_pemohon_id
    AND jp.jns_ref = 'jabatan_id'
    LEFT JOIN m_referensi uk2
        ON uk2.kd_ref = a.unit_kerja_id
    AND uk2.jns_ref = 'unit_kerja_id'
    LEFT JOIN m_referensi jb2
        ON jb2.kd_ref = a.jabatan_id
    AND jb2.jns_ref = 'jabatan_id' 
    LEFT JOIN m_referensi rl
        ON rl.kd_ref = a.role_id
    AND rl.jns_ref = 'role_id' 
    LEFT JOIN m_referensi jpe 
        ON jpe.kd_ref = SUBSTR(a.jenis_biaya_id,1,2) 
        AND jpe.jns_ref = 'jenis_flow' 
    LEFT JOIN m_referensi ju 
        ON ju.kd_ref = a.jenis_user_id 
        AND ju.jns_ref = 'jenis_user_id'
    WHERE a.flag_aktif = 'Y' :condition 
    GROUP BY
        a.jenis_biaya_id,
        a.unit_kerja_pemohon_id,
        a.jabatan_pemohon_id
) x;`

query.countListMasterData = `
SELECT
    COUNT(*) AS total_data,
    CEIL(COUNT(*)::numeric / :limit) AS total_halaman,
    :limit AS limit
FROM m_referensi a 
    WHERE a.flag_show = 'Y' :condition 
;`

query.countListManajemenSession = `
SELECT
    COUNT(*) AS total_data,
    CEIL(COUNT(*)::numeric / :limit) AS total_halaman,
    :limit AS limit
FROM s_users a 
LEFT JOIN m_user b ON b.username = a.username
    WHERE a.s_id is not null :condition 
;`

query.countListJenisPajak = `
SELECT
    COUNT(*) AS total_data,
    CEIL(COUNT(*)::numeric / :limit) AS total_halaman,
    :limit AS limit
FROM m_jenis_pajak a left join m_referensi m1 on m1.kd_ref = a.jenis_pph_id and m1.jns_ref = 'jenis_pph_id'
    WHERE a.kode_objek is not null :condition 
;`

query.getDetailAnggaran = `
WITH budget_biaya AS (
    SELECT
        a.anggaran_id,
        SUM(a.besar_budget) AS total
    FROM d_penambahan_anggaran a
    GROUP BY a.anggaran_id
),
realisasi_biaya AS (
    SELECT
        a.anggaran_id,
        SUM(a.nominal) AS total
    FROM d_pemakaian_anggaran a
    GROUP BY a.anggaran_id
)
SELECT
    a.*,
    c.ur_ref AS cabang,
    d.gl_account,
    d.detail_coa,
    TO_CHAR(TO_DATE(a.bulan || '-01', 'YYYY-MM-DD'), 'Mon YYYY') AS month,
    COALESCE(bb.total,0) AS budget_biaya,
    COALESCE(rb.total,0) AS realisasi_biaya,
    (COALESCE(bb.total,0) - COALESCE(rb.total,0)) AS sisa_anggaran,

    (
        SELECT json_agg(history ORDER BY history.tanggal DESC)
        FROM (

            ----------------------------------------------------------------
            -- PENAMBAHAN
            ----------------------------------------------------------------
            SELECT
                pa.created_at AS tanggal,
                pa.created_by AS aktor,
                pa.besar_budget AS nominal_penambahan,
                CASE
                    WHEN pa.from_anggaran_id IS NOT NULL
                        THEN 'Transfer Budget Dari (' || mcd.gl_account || ' - ' || mcd.detail_coa || ')'
                    ELSE
                        COALESCE(pa.keterangan,'')
                END AS keterangan_penambahan,
                NULL::numeric AS nominal_pemakaian,
                NULL::text AS keterangan_pemakaian
            FROM d_penambahan_anggaran pa left join d_anggaran da 
                on da.anggaran_id = pa.from_anggaran_id 
            left join m_coa_detail mcd on mcd.coa_detail_id = da.coa_detail_id 
            WHERE pa.anggaran_id = a.anggaran_id

            UNION ALL

            ----------------------------------------------------------------
            -- PEMAKAIAN
            ----------------------------------------------------------------
            SELECT
                pm.created_at AS tanggal,
                pm.created_by AS aktor,
                NULL::numeric AS nominal_penambahan,
                NULL::text AS keterangan_penambahan,
                pm.nominal AS nominal_pemakaian,
                CASE
                    WHEN pm.to_anggaran_id IS NOT NULL THEN
                        'Transfer Budget Ke (' || mcd.gl_account || ' - ' || mcd.detail_coa || ')'
                    WHEN pm.pengajuan_coa_id IS NULL THEN
                        COALESCE(pm.keterangan,'')
                    ELSE
                        dp.no_pengajuan
                END AS keterangan_pemakaian
            FROM d_pemakaian_anggaran pm
            LEFT JOIN d_pengajuan_coa pc
                ON pc.pengajuan_coa_id = pm.pengajuan_coa_id
            LEFT JOIN d_pengajuan dp
                ON dp.pengajuan_id = pc.pengajuan_id 
            left join d_anggaran da 
                on da.anggaran_id = pm.to_anggaran_id 
            left join m_coa_detail mcd on mcd.coa_detail_id = da.coa_detail_id 
            WHERE pm.anggaran_id = a.anggaran_id
        ) history
    ) AS history

FROM d_anggaran a

LEFT JOIN m_referensi c
    ON c.kd_ref = a.cabang_id
   AND c.jns_ref = 'cabang_id'

LEFT JOIN m_coa_detail d
    ON d.coa_detail_id = a.coa_detail_id

LEFT JOIN budget_biaya bb
    ON bb.anggaran_id = a.anggaran_id

LEFT JOIN realisasi_biaya rb
    ON rb.anggaran_id = a.anggaran_id

WHERE a.anggaran_id = :anggaran_id

ORDER BY a.created_at DESC;
`

query.getDetailAnggaranByCoa = `
WITH budget_biaya AS (
SELECT 
    a.anggaran_id, 
    SUM(a.besar_budget) AS total 
FROM 
    d_penambahan_anggaran a 
GROUP BY a.anggaran_id
),
realisasi AS (
SELECT 
    a.anggaran_id, 
    SUM(a.nominal) AS total 
FROM 
    d_pemakaian_anggaran a 
GROUP BY a.anggaran_id
),
realisasi_biaya AS (
SELECT
    a.coa_detail_id,
    TO_CHAR(b.created_at, 'MM-YYYY') AS bulan_realisasi,
    SUM(a.nominal) AS total
FROM d_pengajuan_coa a
JOIN d_pengajuan b
    ON b.pengajuan_id = a.pengajuan_id
GROUP BY
    a.coa_detail_id,
    TO_CHAR(b.created_at, 'MM-YYYY')
)
SELECT
    a.*,
    c.ur_ref AS cabang,
    d.gl_account,
    d.detail_coa,
    TO_CHAR(TO_DATE(a.bulan || '-01', 'YYYY-MM-DD'), 'Mon YYYY') AS month,
    COALESCE(bb.total, 0) as budget_biaya,
    COALESCE(r.total, 0) as realisasi_biaya,
    (COALESCE(bb.total, 0) - COALESCE(r.total, 0)) as sisa_anggaran 
FROM d_anggaran a left join 
m_referensi c on c.kd_ref = a.cabang_id and c.jns_ref = 'cabang_id' 
left join m_coa_detail d on d.coa_detail_id = a.coa_detail_id 
left join budget_biaya bb on bb.anggaran_id = a.anggaran_id 
left join realisasi r on r.anggaran_id = a.anggaran_id 
WHERE a.coa_detail_id = :coa_detail_id and a.cabang_id = :cabang_id and a.bulan = :bulan order by a.created_at desc;
`

query.getListAnggaran = `
WITH budget_biaya AS (
SELECT 
    a.anggaran_id, 
    SUM(a.besar_budget) AS total 
FROM 
    d_penambahan_anggaran a 
GROUP BY a.anggaran_id
),
realisasi AS (
SELECT 
    a.anggaran_id, 
    SUM(a.nominal) AS total 
FROM 
    d_pemakaian_anggaran a 
GROUP BY a.anggaran_id
),
realisasi_biaya AS (
SELECT
    a.coa_detail_id,
    TO_CHAR(b.created_at, 'YYYY-MM') AS bulan_realisasi,
    SUM(a.nominal) AS total
FROM d_pengajuan_coa a
JOIN d_pengajuan b
    ON b.pengajuan_id = a.pengajuan_id
GROUP BY
    a.coa_detail_id,
    TO_CHAR(b.created_at, 'YYYY-MM')
)
SELECT
    a.*,
    c.ur_ref AS cabang,
    d.gl_account,
    d.detail_coa,
    TO_CHAR(TO_DATE(a.bulan, 'YYYY-MM'), 'Mon YYYY') AS month,
    COALESCE(bb.total, 0) as budget_biaya,
    COALESCE(r.total, 0) as realisasi_biaya,
    COALESCE(rb.total, 0) as pengajuan_biaya,
    (COALESCE(bb.total, 0) - COALESCE(r.total, 0)) as sisa_anggaran 
FROM d_anggaran a left join 
m_referensi c on c.kd_ref = a.cabang_id and c.jns_ref = 'cabang_id' 
left join m_coa_detail d on d.coa_detail_id = a.coa_detail_id 
left join budget_biaya bb on bb.anggaran_id = a.anggaran_id 
left join realisasi r on r.anggaran_id = a.anggaran_id 
left join realisasi_biaya rb on rb.coa_detail_id = a.coa_detail_id 
and rb.bulan_realisasi = a.bulan 
WHERE a.anggaran_id is not null :condition 
:order 
OFFSET (:page - 1) * :limit 
FETCH NEXT :limit ROWS ONLY;
`

query.countListAnggaran = `
SELECT
    COUNT(a.anggaran_id) AS total_data,
    CEIL(COUNT(a.anggaran_id)::numeric / :limit) AS total_halaman,
    :limit AS limit
FROM d_anggaran a left join 
m_referensi c on c.kd_ref = a.cabang_id and c.jns_ref = 'cabang_id' 
left join m_coa_detail d on d.coa_detail_id = a.coa_detail_id
WHERE a.anggaran_id is not null :condition;
`

query.getListPenjualan = `
SELECT
    a.*,
    TO_CHAR(TO_DATE(a.bulan, 'YYYY-MM'), 'Mon YYYY') AS month 
FROM d_penjualan a
WHERE 1 = 1 :condition 
:order 
OFFSET (:page - 1) * :limit 
FETCH NEXT :limit ROWS ONLY;
`

query.countListPenjualan = `
SELECT
    COUNT(a.penjualan_id) AS total_data,
    CEIL(COUNT(a.penjualan_id)::numeric / :limit) AS total_halaman,
    :limit AS limit
FROM d_penjualan a 
WHERE 1 = 1 :condition;
`

query.getListNotification = `
SELECT a.*, b.*, dp.no_pengajuan as no_pengajuan 
FROM d_notifikasi a left join d_notifikasi_push b ON a.notifikasi_id = b.notifikasi_id left join d_pengajuan dp on dp.pengajuan_id = a.pengajuan_id 
WHERE b.user_id = :user_id  
ORDER BY b.CREATED_AT DESC 
OFFSET (:page - 1) * :limit 
FETCH NEXT :limit ROWS ONLY;
`;

query.getOmset = `
SELECT 
    COALESCE(dp.realisasi_omset, 0) AS omset,
    COALESCE(dp.persen_omset, 0) AS persentase_omset_terhadap_target,
    COALESCE(dp.target_omset, 0) AS target_omset,
    (select sum(c.nominal) from m_coa_detail a left join d_anggaran b 
    on a.coa_detail_id = b.coa_detail_id left join d_pemakaian_anggaran c 
    on b.anggaran_id = c.anggaran_id
    where a.gl_account = '6901010102' and b.cabang_id = :cabang_id
    ) AS total_biaya,
    ROUND(
    (
        COALESCE(
            (
                SELECT SUM(c.nominal)
                FROM m_coa_detail a
                LEFT JOIN d_anggaran b
                    ON a.coa_detail_id = b.coa_detail_id
                LEFT JOIN d_pemakaian_anggaran c
                    ON b.anggaran_id = c.anggaran_id
                WHERE a.gl_account = '6901010102'
                  AND b.cabang_id = :cabang_id
            ),
            0
        ) / NULLIF(COALESCE(dp.realisasi_omset, 0), 0) * 100
    )::numeric,
    2
    ) AS rasio_biaya  
FROM d_penjualan dp 
WHERE dp.bulan = (
    CASE
        WHEN TO_CHAR(TO_DATE(:bulan, 'YYYY-MM-DD'), 'YYYY-MM') =
             TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        THEN TO_CHAR(
                TO_DATE(:bulan, 'YYYY-MM-DD') - INTERVAL '1 month',
                'YYYY-MM'
             )
        ELSE TO_CHAR(
                TO_DATE(:bulan, 'YYYY-MM-DD'),
                'YYYY-MM'
             )
    END
)  
AND dp.cabang_id = :cabang_id
`;

query.getPengajuanOmset = `
SELECT 
    COALESCE(dp.realisasi_omset, 0) AS omset,
    COALESCE(dp.persen_omset, 0) AS persentase_omset_terhadap_target,
    COALESCE(dp.target_omset, 0) AS target_omset,
    COALESCE((select sum(c.nominal) from m_coa_detail a left join d_anggaran b 
    on a.coa_detail_id = b.coa_detail_id left join d_pemakaian_anggaran c 
    on b.anggaran_id = c.anggaran_id
    where b.bulan = TO_CHAR(TO_DATE(':bulan', 'YYYY-MM'), 'YYYY-MM') and b.cabang_id IN (:cabang_id)
    ), 0) AS total_biaya,
    ROUND(
    (
        COALESCE(
            (
                SELECT SUM(c.nominal)
                FROM m_coa_detail a
                LEFT JOIN d_anggaran b
                    ON a.coa_detail_id = b.coa_detail_id
                LEFT JOIN d_pemakaian_anggaran c
                    ON b.anggaran_id = c.anggaran_id
                WHERE b.bulan = TO_CHAR(TO_DATE(':bulan', 'YYYY-MM'), 'YYYY-MM')
                  AND b.cabang_id IN (:cabang_id) 
            ),
            0
        ) / NULLIF(COALESCE(dp.realisasi_omset, 0), 0) * 100
    )::numeric,
    2
    ) AS rasio_biaya  
FROM d_penjualan dp 
WHERE dp.bulan = TO_CHAR(TO_DATE(':bulan', 'YYYY-MM'), 'YYYY-MM') AND dp.cabang_id IN (:cabang_id)
`;

// query.getSLAOverview = `
// WITH sla_detail AS (
//     SELECT
//         a.pengajuan_id,
//         a.target_sla,

//         (
//             SELECT COUNT(*)
//             FROM generate_series(
//                 DATE(a.start_status),
//                 DATE(COALESCE(a.end_status, CURRENT_TIMESTAMP)),
//                 INTERVAL '1 day'
//             ) d
//             WHERE EXTRACT(ISODOW FROM d) < 6
//         ) - 1 AS sla_hari_kerja

//     FROM d_status_pengajuan a join d_pengajuan b on b.pengajuan_id = a.pengajuan_id 
//     WHERE a.start_status IS NOT NULL AND b.flag_aktif = 'Y'
// ),

// pengajuan_sla AS (
//     SELECT
//         pengajuan_id,
//         MAX(
//             CASE
//                 WHEN sla_hari_kerja > target_sla THEN 1
//                 ELSE 0
//             END
//         ) AS is_over
//     FROM sla_detail
//     GROUP BY pengajuan_id
// )

// SELECT
//     COUNT(*) FILTER (WHERE is_over = 0) AS on_sla,
//     COUNT(*) FILTER (WHERE is_over = 1) AS over_sla,
//     ROUND(
//         COUNT(*) FILTER (WHERE is_over = 0)::numeric
//         * 100
//         / NULLIF(COUNT(*), 0),
//         0
//     ) AS sla_achievement
// FROM pengajuan_sla;
// `
// query.getSLAOverview = `
// WITH sla_detail AS (
//     SELECT 
//         a.pengajuan_id,
//         a.target_sla,

//         GREATEST(
//             (
//                 SELECT COUNT(*)
//                 FROM generate_series(
//                     DATE(a.start_status),
//                     DATE(COALESCE(a.end_status, CURRENT_DATE)),
//                     INTERVAL '1 day'
//                 ) AS g(hari)
//                 WHERE
//                     -- Senin - Jumat
//                     EXTRACT(ISODOW FROM g.hari) < 6

//                     -- Tidak termasuk hari libur
//                     AND NOT EXISTS (
//                         SELECT 1
//                         FROM m_hari_libur h
//                         WHERE h.tanggal = DATE(g.hari)
//                     )
//             ) - 1,
//             0
//         ) AS sla_hari_kerja

//     FROM d_status_pengajuan a
//     JOIN d_pengajuan b
//         ON b.pengajuan_id = a.pengajuan_id
//     WHERE
//         a.start_status IS NOT NULL
//         AND b.flag_aktif = 'Y' 
//         AND a.role_id NOT IN ('RL01', 'RL02')
//         AND a.view_only = 'T'
//         AND a.jenis_user_id = '1'
//         AND a.unit_id IS NOT NULL
// ),

// pengajuan_sla AS (
//     SELECT
//         pengajuan_id,

//         MAX(
//             CASE
//                 WHEN sla_hari_kerja > target_sla
//                     THEN 1
//                 ELSE 0
//             END
//         ) AS is_over

//     FROM sla_detail

//     GROUP BY pengajuan_id
// )

// SELECT
//     COUNT(*) FILTER (
//         WHERE is_over = 0
//     ) AS on_sla,

//     COUNT(*) FILTER (
//         WHERE is_over = 1
//     ) AS over_sla,

//     ROUND(
//         COUNT(*) FILTER (
//             WHERE is_over = 0
//         )::numeric
//         * 100
//         / NULLIF(COUNT(*), 0),
//         0
//     ) AS sla_achievement

// FROM pengajuan_sla;
// `
query.getSLAOverview = `
WITH status_prioritas AS (
    SELECT
        a.pengajuan_id,
        a.role_id,

        -- START STATUS:
        -- Prioritas jenis_user_id = 2
        -- Jika tidak ada, ambil jenis_user_id = 1
        MAX(
            CASE
                WHEN a.jenis_user_id = '2'
                    THEN a.start_status
            END
        ) AS start_status_user_2,

        MAX(
            CASE
                WHEN a.jenis_user_id = '1'
                    THEN a.start_status
            END
        ) AS start_status_user_1,

        -- END STATUS:
        -- Selalu ambil dari jenis_user_id = 1
        MAX(
            CASE
                WHEN a.jenis_user_id = '1'
                    THEN a.end_status
            END
        ) AS end_status_user_1,

        -- TARGET SLA:
        -- Selalu ambil dari jenis_user_id = 1
        MAX(
            CASE
                WHEN a.jenis_user_id = '1'
                    THEN a.target_sla
            END
        ) AS target_sla_user_1

    FROM d_status_pengajuan a

    JOIN d_pengajuan b
        ON b.pengajuan_id = a.pengajuan_id

    WHERE
        a.start_status IS NOT NULL
        AND b.flag_aktif = 'Y'
        AND a.role_id NOT IN ('RL01', 'RL02')
        AND a.view_only = 'T'
        AND a.unit_id IS NOT NULL
        AND a.jenis_user_id IN ('1', '2')

    GROUP BY
        a.pengajuan_id,
        a.role_id
),

sla_detail AS (
    SELECT
        pengajuan_id,
        role_id,

        -- START STATUS
        -- Jenis 2 terlebih dahulu, fallback jenis 1
        COALESCE(
            start_status_user_2,
            start_status_user_1
        ) AS start_status,

        -- END STATUS dari jenis 1
        end_status_user_1 AS end_status,

        -- TARGET SLA dari jenis 1
        target_sla_user_1 AS target_sla,

        GREATEST(
            (
                SELECT COUNT(*)
                FROM generate_series(
                    DATE(
                        COALESCE(
                            start_status_user_2,
                            start_status_user_1
                        )
                    ),
                    DATE(
                        COALESCE(
                            end_status_user_1,
                            CURRENT_DATE
                        )
                    ),
                    INTERVAL '1 day'
                ) AS g(hari)

                WHERE
                    -- Senin - Jumat
                    EXTRACT(ISODOW FROM g.hari) < 6

                    -- Tidak termasuk hari libur
                    AND NOT EXISTS (
                        SELECT 1
                        FROM m_hari_libur h
                        WHERE h.tanggal = DATE(g.hari)
                    )
            ) - 1,
            0
        ) AS sla_hari_kerja

    FROM status_prioritas
),

pengajuan_sla AS (
    SELECT
        pengajuan_id,

        MAX(
            CASE
                WHEN sla_hari_kerja > target_sla
                    THEN 1
                ELSE 0
            END
        ) AS is_over

    FROM sla_detail

    GROUP BY
        pengajuan_id
)

SELECT
    COUNT(*) FILTER (
        WHERE is_over = 0
    ) AS on_sla,

    COUNT(*) FILTER (
        WHERE is_over = 1
    ) AS over_sla,

    ROUND(
        COUNT(*) FILTER (
            WHERE is_over = 0
        )::numeric
        * 100
        / NULLIF(COUNT(*), 0),
        0
    ) AS sla_achievement

FROM pengajuan_sla;
`

// query.getSLAPerformance = `
// WITH sla_detail AS (
//     SELECT
//         d.role_id,
//         d.unit_id,
//         d.target_sla,

//         (
//             SELECT COUNT(*)
//             FROM generate_series(
//                 DATE(d.start_status),
//                 DATE(COALESCE(d.end_status, CURRENT_DATE)),
//                 INTERVAL '1 day'
//             ) AS g(hari)
//             WHERE EXTRACT(ISODOW FROM hari) < 6
//         ) - 1 AS sla_hari_kerja

//     FROM d_status_pengajuan d
//     WHERE d.start_status IS NOT NULL
//       AND d.role_id NOT IN ('RL01', 'RL02') AND d.view_only = 'T' 
//       AND d.jenis_user_id = '1' 
//       AND d.unit_id IS NOT NULL :condition
// )

// SELECT
//     z.role_id,
//     m1.ur_ref AS nama_role,
//     COUNT(*) AS task,
//     SUM(
//         CASE
//             WHEN z.sla_hari_kerja <= z.target_sla THEN 1
//             ELSE 0
//         END
//     ) AS on_sla,
//     SUM(
//         CASE
//             WHEN z.sla_hari_kerja > z.target_sla THEN 1
//             ELSE 0
//         END
//     ) AS over_sla,
//     ROUND(
//         SUM(
//             CASE
//                 WHEN z.sla_hari_kerja <= z.target_sla THEN 1
//                 ELSE 0
//             END
//         )::numeric
//         / NULLIF(COUNT(*), 0) * 100,
//         2
//     ) AS kpi
// FROM sla_detail z left join m_referensi m1 
//     on m1.kd_ref = z.role_id and m1.jns_ref = 'role_id' 
// GROUP BY z.role_id, m1.ur_ref
// ORDER BY z.role_id, m1.ur_ref;
// `
// query.getSLAPerformance = `
// WITH sla_detail AS (
//     SELECT
//         d.role_id,
//         d.unit_id,
//         d.target_sla,

//         GREATEST(
//             (
//                 SELECT COUNT(*)
//                 FROM generate_series(
//                     DATE(d.start_status),
//                     DATE(COALESCE(d.end_status, CURRENT_DATE)),
//                     INTERVAL '1 day'
//                 ) AS g(hari)
//                 WHERE
//                     -- Senin - Jumat
//                     EXTRACT(ISODOW FROM g.hari) < 6

//                     -- Tidak termasuk hari libur
//                     AND NOT EXISTS (
//                         SELECT 1
//                         FROM m_hari_libur h
//                         WHERE h.tanggal = DATE(g.hari)
//                     )
//             ) - 1,
//             0
//         ) AS sla_hari_kerja

//     FROM d_status_pengajuan d
//         left join d_pengajuan b on b.pengajuan_id = d.pengajuan_id 
//     WHERE d.start_status IS NOT NULL
//       AND d.role_id NOT IN ('RL01', 'RL02')
//       AND d.view_only = 'T'
//       AND d.jenis_user_id = '1'
//       AND d.unit_id IS NOT NULL 
//       AND b.flag_aktif = 'Y'
//       :condition
// )

// SELECT
//     z.role_id,
//     m1.ur_ref AS nama_role,

//     COUNT(*) AS task,

//     SUM(
//         CASE
//             WHEN z.sla_hari_kerja <= z.target_sla
//                 THEN 1
//             ELSE 0
//         END
//     ) AS on_sla,

//     SUM(
//         CASE
//             WHEN z.sla_hari_kerja > z.target_sla
//                 THEN 1
//             ELSE 0
//         END
//     ) AS over_sla,

//     ROUND(
//         SUM(
//             CASE
//                 WHEN z.sla_hari_kerja <= z.target_sla
//                     THEN 1
//                 ELSE 0
//             END
//         )::numeric
//         / NULLIF(COUNT(*), 0) * 100,
//         2
//     ) AS kpi

// FROM sla_detail z

// LEFT JOIN m_referensi m1
//     ON m1.kd_ref = z.role_id
//     AND m1.jns_ref = 'role_id'

// GROUP BY
//     z.role_id,
//     m1.ur_ref

// ORDER BY
//     z.role_id,
//     m1.ur_ref;
// `
query.getSLAPerformance = `
WITH status_prioritas AS (
    SELECT
        d.pengajuan_id,
        d.role_id,
        d.unit_id,

        -- START STATUS
        -- Prioritas jenis_user_id = 2
        -- Jika tidak ada, gunakan jenis_user_id = 1
        COALESCE(
            MAX(
                CASE
                    WHEN d.jenis_user_id = '2'
                        THEN d.start_status
                END
            ),
            MAX(
                CASE
                    WHEN d.jenis_user_id = '1'
                        THEN d.start_status
                END
            )
        ) AS start_status,

        -- END STATUS
        -- Selalu ambil dari jenis_user_id = 1
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.end_status
            END
        ) AS end_status,

        -- TARGET SLA
        -- Selalu ambil dari jenis_user_id = 1
        MAX(
            CASE
                WHEN d.jenis_user_id = '1'
                    THEN d.target_sla
            END
        ) AS target_sla

    FROM d_status_pengajuan d

    LEFT JOIN d_pengajuan b
        ON b.pengajuan_id = d.pengajuan_id

    WHERE
        d.start_status IS NOT NULL
        AND d.role_id NOT IN ('RL01', 'RL02')
        AND d.view_only = 'T'
        AND d.jenis_user_id IN ('1', '2')
        AND d.unit_id IS NOT NULL
        AND b.flag_aktif = 'Y'
        :condition

    GROUP BY
        d.pengajuan_id,
        d.role_id,
        d.unit_id
),

sla_detail AS (
    SELECT
        d.pengajuan_id,
        d.role_id,
        d.unit_id,
        d.target_sla,

        GREATEST(
            (
                SELECT COUNT(*)
                FROM generate_series(
                    DATE(d.start_status),
                    DATE(
                        COALESCE(
                            d.end_status,
                            CURRENT_DATE
                        )
                    ),
                    INTERVAL '1 day'
                ) AS g(hari)

                WHERE
                    -- Senin - Jumat
                    EXTRACT(ISODOW FROM g.hari) < 6

                    -- Tidak termasuk hari libur
                    AND NOT EXISTS (
                        SELECT 1
                        FROM m_hari_libur h
                        WHERE h.tanggal = DATE(g.hari)
                    )
            ) - 1,
            0
        ) AS sla_hari_kerja

    FROM status_prioritas d
)

SELECT
    z.role_id,
    m1.ur_ref AS nama_role,

    COUNT(*) AS task,

    SUM(
        CASE
            WHEN z.sla_hari_kerja <= z.target_sla
                THEN 1
            ELSE 0
        END
    ) AS on_sla,

    SUM(
        CASE
            WHEN z.sla_hari_kerja > z.target_sla
                THEN 1
            ELSE 0
        END
    ) AS over_sla,

    ROUND(
        SUM(
            CASE
                WHEN z.sla_hari_kerja <= z.target_sla
                    THEN 1
                ELSE 0
            END
        )::numeric
        / NULLIF(COUNT(*), 0) * 100,
        2
    ) AS kpi

FROM sla_detail z

LEFT JOIN m_referensi m1
    ON m1.kd_ref = z.role_id
    AND m1.jns_ref = 'role_id'

GROUP BY
    z.role_id,
    m1.ur_ref

ORDER BY
    z.role_id,
    m1.ur_ref;
`

query.getMenungguPembayaran = `
SELECT 
    a.*,
    c.nama as nama_pemohon,
    mr1.ur_ref as jenis_biaya,
    mr2.ur_ref as jabatan,
    mr3.ur_ref as cabang,
    COUNT(*) OVER() AS total_data,
    CEIL(COUNT(*) OVER()::numeric / :limit) AS total_halaman 
FROM d_pengajuan a left join m_role_user b 
    on b.role_user_id = a.role_pemohon_id left join m_user c 
    on c.user_id = b.user_id 
    left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
    left join m_referensi mr2 ON mr2.kd_ref = b.jabatan_id and mr2.jns_ref = 'jabatan_id' 
    left join m_referensi mr3 ON mr3.kd_ref = b.cabang_id and mr3.jns_ref = 'cabang_id' 
WHERE a.tgl_pembayaran IS NULL
  AND EXISTS (
      SELECT 1
      FROM d_status_pengajuan sp
      WHERE sp.pengajuan_id = a.pengajuan_id
        AND sp.flag_action = 'Y' AND sp.role_id IN ('RL09', 'RL10', 'RL11', 'RL15')
  ) :range :condition
OFFSET (:page - 1) * :limit 
FETCH NEXT :limit ROWS ONLY;
`

query.getPengajuanDashboard = `
WITH status_pengajuan AS (
SELECT *
    FROM (
        SELECT
            s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.unit_kerja_id, s.jabatan_id, s.flag_action, 
            s.view_only, s.jenis_user_id, mr3.ur_ref AS ur_jenis_user_id, s.status_id,
            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn,
            CASE
                            WHEN
                                (
                                    NOT EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                    )
                                )
                            THEN 'VR' 
                            WHEN
                                (
                                    EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('VR')
                                    )
                                )
                            THEN 'VR' 
                            WHEN
                                (
                                    EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('UR')
                                    )
                                )
                            THEN 'UR' 
                            ELSE null
                        END AS status_verifikasi
        FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' left join m_referensi mr3 ON mr3.kd_ref = s.jenis_user_id and mr3.jns_ref = 'jenis_user_id'
        WHERE s.flag_show = 'Y' AND s.view_only = 'T' order by s.no_urut DESC
    ) x
    WHERE rn = 1
)
SELECT 
    a.*,
    c.nama as nama_pemohon,
    mr1.ur_ref as jenis_biaya,
    mr2.ur_ref as jabatan,
    mr3.ur_ref as cabang,
    COUNT(*) OVER() AS total_data,
    CEIL(COUNT(*) OVER()::numeric / :limit) AS total_halaman 
FROM d_pengajuan a left join m_role_user b 
    on b.role_user_id = a.role_pemohon_id left join m_user c 
    on c.user_id = b.user_id 
    left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
    left join m_referensi mr2 ON mr2.kd_ref = b.jabatan_id and mr2.jns_ref = 'jabatan_id' 
    left join m_referensi mr3 ON mr3.kd_ref = b.cabang_id and mr3.jns_ref = 'cabang_id' 
    left join status_pengajuan sp on sp.pengajuan_id = a.pengajuan_id 
WHERE a.flag_aktif = 'Y' AND sp.role_id is not null :condition
OFFSET (:page - 1) * :limit 
FETCH NEXT :limit ROWS ONLY;
`

query.getTaskAktifMingguIni = `
WITH status_pengajuan AS (
SELECT *
    FROM (
        SELECT
            s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.unit_kerja_id, s.jabatan_id, s.flag_action, 
            s.view_only, s.jenis_user_id, mr3.ur_ref AS ur_jenis_user_id, s.status_id,
            s.start_status,
            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn,
            CASE
                            WHEN
                                (
                                    NOT EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                    )
                                )
                            THEN 'VR' 
                            WHEN
                                (
                                    EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('VR')
                                    )
                                )
                            THEN 'VR' 
                            WHEN
                                (
                                    EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('UR')
                                    )
                                )
                            THEN 'UR' 
                            ELSE null
                        END AS status_verifikasi
        FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' left join m_referensi mr3 ON mr3.kd_ref = s.jenis_user_id and mr3.jns_ref = 'jenis_user_id'
        WHERE s.view_only = 'T' :condition order by s.no_urut DESC
    ) x
    WHERE rn = 1
)
SELECT 
    a.*,
    c.nama as nama_pemohon,
    mr1.ur_ref as jenis_biaya,
    mr2.ur_ref as jabatan,
    mr3.ur_ref as cabang,
    COUNT(*) OVER() AS total_data,
    CEIL(COUNT(*) OVER()::numeric / :limit) AS total_halaman 
FROM d_pengajuan a left join m_role_user b 
    on b.role_user_id = a.role_pemohon_id left join m_user c 
    on c.user_id = b.user_id 
    left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
    left join m_referensi mr2 ON mr2.kd_ref = b.jabatan_id and mr2.jns_ref = 'jabatan_id' 
    left join m_referensi mr3 ON mr3.kd_ref = b.cabang_id and mr3.jns_ref = 'cabang_id' 
    inner join status_pengajuan sp on sp.pengajuan_id = a.pengajuan_id 
WHERE a.flag_aktif = 'Y' AND 
    sp.start_status >= date_trunc('week', CURRENT_DATE) 
    AND sp.start_status < date_trunc('week', CURRENT_DATE) + interval '1 week'
OFFSET (:page - 1) * :limit 
FETCH NEXT :limit ROWS ONLY;
`

query.getSummaryPengajuanDashboard = `
WITH status_pengajuan AS (
SELECT *
    FROM (
        SELECT
            s.pengajuan_id, s.role_id, s.kegiatan, mr1.ur_ref AS role, mr2.ur_ref AS status_terbaru, s.kd_status, s.unit_kerja_id, s.jabatan_id, s.flag_action, 
            s.view_only, s.jenis_user_id, mr3.ur_ref AS ur_jenis_user_id, s.status_id,
            ROW_NUMBER() OVER (
                PARTITION BY s.pengajuan_id
                ORDER BY s.no_urut DESC
            ) AS rn,
            CASE
                            WHEN
                                (
                                    NOT EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                    )
                                )
                            THEN 'VR' 
                            WHEN
                                (
                                    EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('VR')
                                    )
                                )
                            THEN 'VR' 
                            WHEN
                                (
                                    EXISTS (
                                        SELECT 1
                                        FROM d_status_pengajuan x
                                        WHERE x.pengajuan_id = s.pengajuan_id
                                        AND x.unit_kerja_id = s.unit_kerja_id
                                        AND x.jenis_user_id != '1'
                                        AND x.kd_status IN ('UR')
                                    )
                                )
                            THEN 'UR' 
                            ELSE null
                        END AS status_verifikasi
        FROM d_status_pengajuan s left join m_referensi mr1 on mr1.kd_ref = s.role_id and mr1.jns_ref = 'role_id' left join m_referensi mr2 ON mr2.kd_ref = s.kd_status and mr2.jns_ref = 'kd_status' left join m_referensi mr3 ON mr3.kd_ref = s.jenis_user_id and mr3.jns_ref = 'jenis_user_id'
        WHERE s.flag_show = 'Y' AND s.view_only = 'T' order by s.no_urut DESC
    ) x
    WHERE rn = 1
)
SELECT 
    COUNT(*) FILTER (
    WHERE (sp.kd_status IS NULL OR sp.kd_status = '')
      AND sp.role_id = 'RL02'
    ) OVER() AS total_diajukan,
    COUNT(*) FILTER (
        WHERE (sp.kd_status IS NULL OR sp.kd_status = '')
        AND sp.jenis_user_id != '1'
    ) OVER() AS total_verifikasi,
    COUNT(*) FILTER (
        WHERE (sp.kd_status IS NULL OR sp.kd_status = '')
        AND sp.role_id NOT IN ('RL01', 'RL02')
        AND sp.jenis_user_id = '1'
    ) OVER() AS total_approval,
    COUNT(*) FILTER (
        WHERE sp.kd_status = 'S2'
        AND sp.role_id != 'RL01'
    ) OVER() AS total_selesai,
    COUNT(*) FILTER (
        WHERE sp.kd_status = 'T'
    ) OVER() AS total_ditolak 
FROM d_pengajuan a left join m_role_user b 
    on b.role_user_id = a.role_pemohon_id left join m_user c 
    on c.user_id = b.user_id 
    left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
    left join m_referensi mr2 ON mr2.kd_ref = b.jabatan_id and mr2.jns_ref = 'jabatan_id' 
    left join m_referensi mr3 ON mr3.kd_ref = b.cabang_id and mr3.jns_ref = 'cabang_id' 
    left join status_pengajuan sp on sp.pengajuan_id = a.pengajuan_id 
WHERE a.flag_aktif = 'Y' AND sp.role_id is not null :condition
`

query.getSummaryTaskAktifMingguIni = `
SELECT 
    COUNT(*) FILTER (
    :semua
    ) OVER() AS semua,
    COUNT(*) FILTER (
    :menunggu_approval
    ) OVER() AS menunggu_approval,
    COUNT(*) FILTER (
    :diproses
    ) OVER() AS diproses,
    COUNT(*) FILTER (
    :ditolak
    ) OVER() AS ditolak 
FROM d_pengajuan a left join m_role_user b 
    on b.role_user_id = a.role_pemohon_id left join m_user c 
    on c.user_id = b.user_id 
    left join m_referensi mr1 ON mr1.kd_ref = a.jenis_biaya_id and mr1.jns_ref = 'jenis_biaya_id' 
    left join m_referensi mr2 ON mr2.kd_ref = b.jabatan_id and mr2.jns_ref = 'jabatan_id' 
    left join m_referensi mr3 ON mr3.kd_ref = b.cabang_id and mr3.jns_ref = 'cabang_id' 
    inner join d_status_pengajuan s on s.pengajuan_id = a.pengajuan_id 
WHERE a.flag_aktif = 'Y' AND s.view_only = 'T' AND s.start_status >= date_trunc('week', CURRENT_DATE) 
    AND s.start_status < date_trunc('week', CURRENT_DATE) + interval '1 week'
`

query.getListVendor = `
select a.*
from m_vendor a where a.vendor_id is not null :condition :order
OFFSET (:page - 1) * :limit 
FETCH NEXT :limit ROWS ONLY;
`;

query.countListVendor = `
select COUNT(DISTINCT a.vendor_id) AS "total_data",
    CEIL(COUNT(DISTINCT a.vendor_id)::numeric / :limit) AS "total_halaman",
    :limit AS "limit"
from m_vendor a where a.vendor_id is not null :condition`;

query.getPenjualan = `
SELECT
    sum(a.target_omset) as target_omset,
    sum(a.realisasi_omset) as realisasi_omset 
    -- TO_CHAR(TO_DATE(a.bulan, 'YYYY-MM'), 'Mon YYYY') AS month 
FROM d_penjualan a
WHERE a.bulan is not null :condition; -- GROUP BY a.bulan
`

query.clearSession = `
UPDATE s_users SET is_active = 'T' where is_active = 'Y'
`

query.getListHariLibur = `
    SELECT 
        ROW_NUMBER() OVER (ORDER BY a.TANGGAL :order) AS row_number,
        a.*,
        TO_CHAR(a.tanggal, 'DD Mon YYYY') AS tgl  
    FROM m_hari_libur a 
    WHERE 
        (EXTRACT(YEAR FROM a.tanggal)::TEXT like :keyword
        OR upper(TO_CHAR(a.tanggal, 'DD/MM/YYYY')) like upper(:keyword)
        OR upper(a.deskripsi) like upper(:keyword)
        )
    ORDER BY a.tanggal :order
    OFFSET (:page - 1) * :limit 
    FETCH NEXT :limit ROWS ONLY;`

query.countListHariLibur = `
    SELECT
       count(a.m_h_id) AS "total_data",
       CEIL(COUNT(DISTINCT a.m_h_id)::numeric / :limit) AS "total_halaman",
       :limit AS "limit"
    FROM m_hari_libur a 
    WHERE 
        (EXTRACT(YEAR FROM a.tanggal)::TEXT like :keyword
        OR upper(TO_CHAR(a.tanggal, 'DD/MM/YYYY')) like upper(:keyword)
        OR upper(a.deskripsi) like upper(:keyword)
        );`

module.exports = query;
