export const getErrorMessage = (error: unknown): string => {
  let errorMessage = "Não foi possível gerar o PDF.";
  const message =
    typeof error === "string"
      ? error
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";

  if (message.includes("imagem") || message.includes("image")) {
    errorMessage =
      "Erro ao processar imagens. Algumas fotos podem estar corrompidas ou inacessíveis.";
  } else if (message.includes("página") || message.includes("page")) {
    errorMessage =
      "Erro ao processar páginas do relatório. Tente aguardar o carregamento completo antes de gerar o PDF.";
  } else if (message.includes("Nenhuma página")) {
    errorMessage =
      "Nenhum conteúdo encontrado para gerar o PDF. Verifique se a vistoria possui dados e fotos.";
  } else if (message.includes("timeout") || message.includes("Timeout")) {
    errorMessage = "Timeout durante o processamento. Tente novamente com uma conexão mais estável.";
  } else if (message.includes("canvas") || message.includes("Canvas")) {
    errorMessage = "Erro na renderização do conteúdo. Tente recarregar a página e gerar novamente.";
  }

  return errorMessage;
};

export const logPageDetails = (pages: HTMLElement[]) => {
  console.log(`=== ANÁLISE DETALHADA DAS PÁGINAS ===`);
  console.log(`Total de páginas encontradas: ${pages.length}`);

  pages.forEach((page, index) => {
    const rect = page.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(page);

    const pageInfo = {
      index: index + 1,
      className: page.className,
      id: page.id,
      tagName: page.tagName,
      scrollHeight: page.scrollHeight,
      scrollWidth: page.scrollWidth,
      offsetHeight: page.offsetHeight,
      offsetWidth: page.offsetWidth,
      clientHeight: page.clientHeight,
      clientWidth: page.clientWidth,
      boundingRect: {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
      },
      style: {
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        position: computedStyle.position,
        overflow: computedStyle.overflow,
      },
      childrenCount: page.children.length,
      hasImages: page.querySelectorAll("img").length,
      hasContent: page.textContent?.trim().length || 0,
      isVisible: rect.width > 0 && rect.height > 0,
      hasMinHeight: page.scrollHeight >= 500,
    };

    console.log(`📄 Página ${index + 1} análise:`, pageInfo);

    // Verificar se a página tem problemas
    const problemas = [];
    if (!pageInfo.isVisible) problemas.push("não visível");
    if (pageInfo.style.display === "none") problemas.push("display none");
    if (pageInfo.style.visibility === "hidden") problemas.push("visibility hidden");
    if (pageInfo.hasContent === 0) problemas.push("sem conteúdo");
    if (pageInfo.scrollHeight < 100) problemas.push("muito pequena");

    if (problemas.length > 0) {
      console.warn(`⚠️ Página ${index + 1} tem problemas:`, problemas);
    } else {
      console.log(`✅ Página ${index + 1} parece estar OK`);
    }
  });
};

export const validatePages = (reportElement: HTMLElement): HTMLElement[] => {
  console.log("=== INICIANDO VALIDAÇÃO DE PÁGINAS ===");
  console.log("Elemento do relatório:", {
    tagName: reportElement.tagName,
    className: reportElement.className,
    id: reportElement.id,
    childrenCount: reportElement.children.length,
    scrollHeight: reportElement.scrollHeight,
    scrollWidth: reportElement.scrollWidth,
  });

  // Primeira tentativa: buscar por classe .page
  let pages = Array.from(reportElement.querySelectorAll(".page")) as HTMLElement[];
  console.log(`Primeira busca (.page): ${pages.length} elementos encontrados`);

  // Se não encontrou, tentar outras estratégias
  if (pages.length === 0) {
    console.log("❌ Nenhuma página com classe .page encontrada!");
    console.log("Tentando estratégias alternativas...");

    // Estratégia 2: buscar por elementos com min-h-screen
    pages = Array.from(reportElement.querySelectorAll('[class*="min-h-screen"]')) as HTMLElement[];
    console.log(`Segunda busca (min-h-screen): ${pages.length} elementos encontrados`);

    // Estratégia 3: buscar por divs grandes
    if (pages.length === 0) {
      const allDivs = Array.from(reportElement.querySelectorAll("div")) as HTMLElement[];
      console.log(`Total de divs no relatório: ${allDivs.length}`);

      pages = allDivs.filter(div => {
        const rect = div.getBoundingClientRect();
        const hasGoodHeight = div.offsetHeight > 500 || div.scrollHeight > 500;
        const hasContent = (div.textContent?.trim().length || 0) > 50;
        const isVisible = rect.width > 0 && rect.height > 0;

        console.log(`Analisando div:`, {
          className: div.className,
          hasGoodHeight,
          hasContent,
          isVisible,
          offsetHeight: div.offsetHeight,
          scrollHeight: div.scrollHeight,
          textLength: div.textContent?.trim().length || 0,
        });

        return hasGoodHeight && hasContent && isVisible;
      });

      console.log(`Terceira busca (divs grandes): ${pages.length} elementos encontrados`);
    }

    // Estratégia 4: usar children diretos do reportElement
    if (pages.length === 0) {
      pages = Array.from(reportElement.children).filter(child => {
        const element = child as HTMLElement;
        const rect = element.getBoundingClientRect();
        return rect.height > 200 && (element.textContent?.trim().length || 0) > 20;
      }) as HTMLElement[];

      console.log(`Quarta busca (children diretos): ${pages.length} elementos encontrados`);
    }
  }

  // Log detalhado das páginas encontradas
  logPageDetails(pages);

  // Validação final
  if (pages.length === 0) {
    console.error("=== ERRO CRÍTICO ===");
    console.error("Nenhuma página válida encontrada após todas as tentativas!");
    console.error("Estrutura do DOM do relatório:");
    console.error(reportElement.innerHTML.substring(0, 1000) + "...");

    throw new Error(
      "Nenhuma página encontrada para processar. Verifique se o conteúdo foi carregado corretamente.",
    );
  }

  console.log(`=== VALIDAÇÃO CONCLUÍDA ===`);
  console.log(`Páginas válidas encontradas: ${pages.length}`);

  return pages;
};
