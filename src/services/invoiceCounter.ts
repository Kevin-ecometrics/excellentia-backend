import pool from '../db/connection.ts';

// Reserva atómica del próximo número de factura (company_settings.invoice_counter)
// y ejecuta `fn` con ese número — evita la carrera de "dos ventas casi
// simultáneas leen el mismo invoice_counter antes de que la primera termine
// de incrementarlo", que existía en cada uno de los 5 lugares que tocan este
// contador (createOrder/createBatch/retryBatchSync en orderController.ts,
// processPendingOrders en syncEngine.ts, convertPreOrder en
// preOrderController.ts): cada uno hacía SELECT, después la llamada HTTP a
// QBO (lenta), y recién ahí el UPDATE +1 — dos requests podían leer el mismo
// valor antes de que cualquiera de las dos llegara al UPDATE.
//
// Serializa con un named lock de MySQL (GET_LOCK) en vez de un `SELECT ...
// FOR UPDATE` — así no se mantiene una fila trabada durante toda la llamada
// a QBO (que puede tardar), solo se serializa esta sección crítica puntual
// entre sí. El contador solo se incrementa si `fn` llama a `markSuccess()` —
// mismo criterio que ya usaba cada call site (una factura que falla en QBO
// no quema un número: invoice_counter tiene que poder alinearse con un
// talonario físico de facturas, ver PUT /api/settings/invoice-counter).
export async function withInvoiceNumber<T>(
  fn: (invoiceNumber: number, markSuccess: () => Promise<void>) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    const [[lockRow]] = await conn.query(
      "SELECT GET_LOCK('invoice_counter', 10) AS acquired"
    ) as any[];
    if (Number(lockRow.acquired) !== 1) {
      throw new Error('No se pudo reservar el número de factura (lock ocupado, reintentar)');
    }
    try {
      const [[{ invoice_counter }]] = await conn.query(
        'SELECT invoice_counter FROM company_settings WHERE id = 1'
      ) as any[];
      const markSuccess = async () => {
        await conn.query('UPDATE company_settings SET invoice_counter = invoice_counter + 1 WHERE id = 1');
      };
      return await fn(invoice_counter, markSuccess);
    } finally {
      await conn.query("SELECT RELEASE_LOCK('invoice_counter')");
    }
  } finally {
    conn.release();
  }
}

// Reserva un número de factura sin llamar a QBO — usado por el flujo de
// aprobación de admin (createOrder/createBatch/convertPreOrder): el ticket
// se imprime con este número al instante, pero la factura real en QBO recién
// se crea cuando un admin aprueba (POST /api/orders/batch/:batchId/approve).
// markSuccess() se llama incondicionalmente porque, a diferencia de
// withInvoiceNumber() (que solo avanza el contador si QBO confirmó), acá ya
// no hay forma de saber en este momento si QBO lo va a aceptar más tarde —
// el número se considera "usado" en cuanto se reserva/imprime, igual que un
// talonario físico.
export async function reserveInvoiceNumber(): Promise<number> {
  return withInvoiceNumber(async (invoiceNumber, markSuccess) => {
    await markSuccess();
    return invoiceNumber;
  });
}
