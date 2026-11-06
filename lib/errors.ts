type BackendError = {
  detalhes?: string[];
  message?: string;
  mensagem?: string;
  errors?: Record<string, string> | { field?: string; message?: string }[];
  fieldErrors?: Record<string, string>;
};
export function errorMessage(error: unknown): string {
  const e = error as
    | {
        status?: number;
        data?: BackendError;
        response?: { status?: number; data?: BackendError };
      }
    | undefined;
  const status = e?.status || e?.response?.status;
  if (status === 401) return "Sessão expirada. Entre novamente para continuar.";
  if (status === 403) return "Acesso negado. Você não tem permissão para esta operação.";
  const data = e?.data || e?.response?.data;
  if (status && [400, 404, 409, 422, 502].includes(status)) {
    const fields = data?.errors || data?.fieldErrors;
    const details = fields
      ? (Array.isArray(fields)
          ? fields.map((x) => [x.field, x.message].filter(Boolean).join(": "))
          : Object.entries(fields).map(([key, value]) => `${key}: ${value}`)
        ).join(" · ")
      : data?.detalhes?.join(" · ") || "";
    return [
      data?.message ||
        data?.mensagem ||
        {
          404: "Registro não encontrado.",
          409: "Este registro está duplicado ou permanece referenciado.",
        }[status] ||
        "Revise os dados informados.",
      details,
    ]
      .filter(Boolean)
      .join(" ");
  }
  return "Não foi possível concluir a solicitação. Verifique a conexão e tente novamente.";
}
export function isMissing(error: unknown) {
  const e = error as { status?: number; response?: { status?: number } };
  return e?.status === 404 || e?.response?.status === 404;
}
