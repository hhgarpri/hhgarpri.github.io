const { jsPDF } = window.jspdf;

async function generatePDF() {
  const pdf = new jsPDF('p', 'pt', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = 60;
  const marginHorizontal = 40;
  const contentWidth = pageWidth - 2 * marginHorizontal;
  const textColor = '#333333';
  const headingColor = '#007bff';
  const sectionColor = '#f8f9fa';
  const borderColor = '#cccccc';
  const fontSizeBase = 12;
  const lineHeightMultiplier = 1.5;

  pdf.setTextColor(textColor);

  function addAlignedText(text, yPosition, options = {}) {
    const { size = fontSizeBase, style = 'normal', align = 'left' } = options;
    pdf.setFontSize(size);
    pdf.setFont("helvetica", style);
    const textWidth = pdf.getTextWidth(text);
    let xPosition;
    if (align === 'center') {
      xPosition = (pageWidth - textWidth) / 2;
    } else if (align === 'right') {
      xPosition = pageWidth - marginHorizontal - textWidth;
    } else {
      xPosition = marginHorizontal;
    }
    pdf.text(text, xPosition, yPosition);
    return yPosition + size * lineHeightMultiplier;
  }

  function addSectionTitle(text, yPosition) {
    pdf.setFontSize(16);
    pdf.setFont("helvetica", 'bold');
    pdf.setTextColor(headingColor);
    const textWidth = pdf.getTextWidth(text);
    const xPosition = marginHorizontal;
    pdf.text(text, xPosition, yPosition);
    pdf.setTextColor(textColor);
    return yPosition + 20;
  }

  function addParagraph(text, yPosition, options = {}) {
    const { size = fontSizeBase, style = 'normal', maxWidth = contentWidth } = options;
    pdf.setFontSize(size);
    pdf.setFont("helvetica", style);
    const splitText = pdf.splitTextToSize(text, maxWidth);
    pdf.text(splitText, marginHorizontal, yPosition);
    return yPosition + splitText.length * size * lineHeightMultiplier;
  }

  function addCodeBlock(text, yPosition) {
    pdf.setFillColor('#f0f0f0');
    pdf.rect(marginHorizontal, yPosition, contentWidth, text.split('\n').length * 10 * lineHeightMultiplier + 5, 'F');
    pdf.setFont("courier", 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor('#222222');
    let currentY = yPosition + 5;
    text.split('\n').forEach(line => {
      pdf.text(line, marginHorizontal + 5, currentY);
      currentY += 10 * lineHeightMultiplier;
    });
    pdf.setTextColor(textColor);
    pdf.setFont("helvetica", 'normal');
    pdf.setFontSize(fontSizeBase);
    return currentY + 5;
  }

  function addOutputBlock(text, yPosition) {
    pdf.setFillColor('#e6f7ff');
    pdf.rect(marginHorizontal, yPosition, contentWidth, text.split('\n').length * 10 * lineHeightMultiplier + 5, 'F');
    pdf.setFont("courier", 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor('#0056b3');
    let currentY = yPosition + 5;
    text.split('\n').forEach(line => {
      pdf.text(line, marginHorizontal + 5, currentY);
      currentY += 10 * lineHeightMultiplier;
    });
    pdf.setTextColor(textColor);
    pdf.setFont("helvetica", 'normal');
    pdf.setFontSize(fontSizeBase);
    return currentY + 5;
  }

  function addCheckboxResponse(text, yPosition) {
    pdf.setFontSize(fontSizeBase);
    pdf.setFont("helvetica", 'normal');
    pdf.setFillColor(headingColor);
    pdf.rect(marginHorizontal, yPosition - 5, 5, 5, 'F');
    pdf.text(text, marginHorizontal + 10, yPosition);
    return yPosition + fontSizeBase * lineHeightMultiplier;
  }

  function addPageBreak() {
    pdf.addPage();
    y = 60;
  }

  function checkPageSpace(requiredHeight) {
    if (y + requiredHeight > pageHeight - 40) {
      addPageBreak();
    }
  }

  y = addAlignedText("Resumen de Respuestas del Cuestionario", y, { size: 24, style: 'bold', align: 'center' });
  y += 30;

  const preguntas = document.querySelectorAll('.pregunta');
  preguntas.forEach((pregunta, index) => {
    let preguntaTitulo = pregunta.querySelector('h3')?.innerText || `Pregunta ${index + 1}`;
    checkPageSpace(50);
    y = addSectionTitle(preguntaTitulo, y);

    const descripcionElement = pregunta.querySelector('.descripcion');
    if (descripcionElement && descripcionElement.innerText.trim()) {
      y = addParagraph(descripcionElement.innerText.trim(), y, { size: 11 });
      y += 5;
    }

    const codeTextarea = pregunta.querySelector('textarea[id^="code-"]');
    if (codeTextarea && window.codeMirrorEditors && window.codeMirrorEditors[codeTextarea.id]) {
      const codeContent = window.codeMirrorEditors[codeTextarea.id].getValue();
      checkPageSpace(codeContent.split('\n').length * 10 * lineHeightMultiplier + 20);
      y = addParagraph("Código:", y, { size: 12, style: 'bold' });
      y = addCodeBlock(codeContent, y);
      y += 10;
    } else if (codeTextarea && codeTextarea.value.trim()) {
      checkPageSpace(codeTextarea.value.split('\n').length * 10 * lineHeightMultiplier + 20);
      y = addParagraph("Código:", y, { size: 12, style: 'bold' });
      y = addCodeBlock(codeTextarea.value.trim(), y);
      y += 10;
    }

    const output = pregunta.querySelector('.output-box');
    if (output && output.innerText.trim() && output.innerText.trim() !== 'Salida aparecerá aquí...') {
      checkPageSpace(output.innerText.split('\n').length * 10 * lineHeightMultiplier + 20);
      y = addParagraph("Salida:", y, { size: 12, style: 'bold' });
      y = addOutputBlock(output.innerText.trim(), y);
      y += 10;
    }

    const textInput = pregunta.querySelector('textarea.text-input');
    if (textInput && textInput.value.trim()) {
      const preguntaElement = pregunta.querySelector('p');
      const preguntaEnunciado = preguntaElement ? preguntaElement.innerText.trim() : 'Pregunta:';
      checkPageSpace(40);
      y = addParagraph(preguntaEnunciado, y, { size: 11, style: 'bold' });
      y = addParagraph(`Respuesta: ${textInput.value.trim()}`, y, { size: 11 });
      y += 10;
    }

    const checkboxes = pregunta.querySelectorAll('input[type="checkbox"]:checked');
    if (checkboxes.length > 0) {
      const checkedValues = Array.from(checkboxes).map(c => c.parentNode.innerText.trim());
      checkPageSpace(checkedValues.length * 15);
      y = addParagraph("Opciones seleccionadas:", y, { size: 11, style: 'bold' });
      checkedValues.forEach(value => {
        y = addCheckboxResponse(value, y);
      });
      y += 10;
    }

    if (pregunta.classList.contains('verdadero-falso')) {
      pregunta.querySelectorAll('label').forEach((label, vfIndex) => {
        const questionText = label.textContent.trim();
        const answerInput = label.querySelector('input[type="text"].tf-input');
        const answer = answerInput ? answerInput.value.trim() : '';

        checkPageSpace(30);
        y = addParagraph(`${index + 1}.${vfIndex + 1}. ${questionText}`, y, { size: 11 });
        if (answer) {
          y = addParagraph(`   Respuesta: ${answer}`, y, { size: 11 });
        }
      });
    }

    checkPageSpace(5);
    pdf.setDrawColor(borderColor);
    pdf.setLineWidth(0.5);
    pdf.line(marginHorizontal, y, pageWidth - marginHorizontal, y);
    y += 20;
  });

  pdf.save("respuestas_cuestionario.pdf");
}

document.querySelector('.submit-button').addEventListener('click', generatePDF);