import { ZERO_BYTES32 } from "../config/domain.js";

export const PROJECT_LIMITS = {
  TITLE_MIN: 3,
  TITLE_MAX: 80,
  DESCRIPTION_MIN: 10,
  DESCRIPTION_MAX: 1500,
  AMOUNT_MIN_ETH: 0.0001,
  AMOUNT_MAX_ETH: 100,
  URL_MAX: 2048,
};

/**
 * Valida regras de entrada e domínio do SmartFreela antes de enviar transações.
 */
export class ProjectValidator {
  isValidHttpUrl(rawUrl) {
    const trimmed = String(rawUrl || "").trim();
    if (!trimmed || trimmed.length > PROJECT_LIMITS.URL_MAX) {
      return false;
    }

    try {
      const parsed = new URL(trimmed);
      const isHttpProtocol =
        parsed.protocol === "https:" || parsed.protocol === "http:";
      const hasValidHost =
        Boolean(parsed.hostname) &&
        parsed.hostname.includes(".") &&
        !parsed.hostname.startsWith(".") &&
        !parsed.hostname.endsWith(".");

      return isHttpProtocol && hasValidHost;
    } catch {
      return false;
    }
  }

  validateCreateProject(
    { title, description, dueDateInput, amountEth },
    { isContractActive }
  ) {
    if (!isContractActive) {
      return {
        valid: false,
        error: "O contrato está temporariamente pausado pelo administrador.",
      };
    }

    const cleanTitle = String(title || "").trim();
    const cleanDesc = String(description || "").trim();

    if (!cleanTitle || !cleanDesc || !amountEth || !dueDateInput) {
      return {
        valid: false,
        error: "Preencha título, descrição, prazo de entrega e valor em ETH.",
      };
    }

    if (
      cleanTitle.length < PROJECT_LIMITS.TITLE_MIN ||
      cleanTitle.length > PROJECT_LIMITS.TITLE_MAX
    ) {
      return {
        valid: false,
        error: `O título deve ter entre ${PROJECT_LIMITS.TITLE_MIN} e ${PROJECT_LIMITS.TITLE_MAX} caracteres.`,
      };
    }

    if (
      cleanDesc.length < PROJECT_LIMITS.DESCRIPTION_MIN ||
      cleanDesc.length > PROJECT_LIMITS.DESCRIPTION_MAX
    ) {
      return {
        valid: false,
        error: `A descrição deve ter entre ${PROJECT_LIMITS.DESCRIPTION_MIN} e ${PROJECT_LIMITS.DESCRIPTION_MAX} caracteres.`,
      };
    }

    const amountNum = parseFloat(amountEth);
    if (
      Number.isNaN(amountNum) ||
      amountNum < PROJECT_LIMITS.AMOUNT_MIN_ETH ||
      amountNum > PROJECT_LIMITS.AMOUNT_MAX_ETH
    ) {
      return {
        valid: false,
        error: `Informe um valor em ETH entre ${PROJECT_LIMITS.AMOUNT_MIN_ETH} e ${PROJECT_LIMITS.AMOUNT_MAX_ETH}.`,
      };
    }

    const dueDateTimestamp = Math.floor(
      new Date(`${dueDateInput}T23:59:59Z`).getTime() / 1000
    );
    const currentTimestamp = Math.floor(Date.now() / 1000);

    if (Number.isNaN(dueDateTimestamp) || dueDateTimestamp <= currentTimestamp) {
      return {
        valid: false,
        error: "O prazo de entrega deve ser uma data futura válida.",
      };
    }

    return {
      valid: true,
      data: {
        title: cleanTitle,
        description: cleanDesc,
        dueDateTimestamp,
        amountEth: String(amountEth).trim(),
      },
    };
  }

  validateDelivery({ projectId, deliveryUrl, deliveryHash }) {
    if (!projectId) {
      return {
        valid: false,
        title: "Erro Interno",
        error: "Nenhum projeto selecionado para entrega.",
      };
    }

    const cleanUrl = String(deliveryUrl || "").trim();
    if (!this.isValidHttpUrl(cleanUrl)) {
      return {
        valid: false,
        error:
          "Informe uma URL válida começando com http:// ou https:// (ex.: link do GitHub, Vercel ou deploy público).",
      };
    }

    if (!deliveryHash || deliveryHash === ZERO_BYTES32) {
      return {
        valid: false,
        error: "Hash de integridade inválido para a URL informada.",
      };
    }

    return {
      valid: true,
      data: {
        projectId,
        deliveryUrl: cleanUrl,
        deliveryHash,
      },
    };
  }

  validateDisputeResolution({ projectId, freelancerPercentage }) {
    if (!projectId) {
      return {
        valid: false,
        title: "Erro Interno",
        error: "Nenhum projeto em disputa selecionado.",
      };
    }

    if (
      Number.isNaN(freelancerPercentage) ||
      freelancerPercentage < 0 ||
      freelancerPercentage > 100
    ) {
      return {
        valid: false,
        error: "Informe um percentual válido entre 0 e 100.",
      };
    }

    return {
      valid: true,
      data: {
        projectId,
        freelancerPercentage,
      },
    };
  }
}