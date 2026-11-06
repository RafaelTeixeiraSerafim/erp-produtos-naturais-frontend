import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
afterEach(cleanup);

// Model the server-provided, credential-free environment namespace.
import { beforeEach } from "vitest";
beforeEach(() => {
  localStorage.clear();
  document.head.innerHTML = '<meta name="recovery-environment" content="test-backend">';
});

import { vi } from "vitest";
vi.mock("@/components/auth", async importOriginal => {
  const original = await importOriginal<typeof import("@/components/auth")>();
  const user = { id: "11111111-1111-4111-8111-111111111111", nome: "Ana", email: "ana@example.test", cargo: "ADMIN", lojas: [], permissions: [], alterarSenha: false };
  return { ...original, useIdentity: () => user, useCan: () => true, useOperator: () => ({ data: [user], isSuccess: true, isPending: false, isFetching: false, isError: false, error: null, refetch: vi.fn() }) };
});
