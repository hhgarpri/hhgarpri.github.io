const { jsPDF } = window.jspdf;

async function generatePDF() {
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let y = 50; // Posición Y inicial (ligeramente más arriba)
    const marginHorizontal = 35; // Márgenes horizontales reducidos
    const pageBottomMargin = 50; // Margen inferior reducido
    const contentWidth = pageWidth - 2 * marginHorizontal;
    const textColor = '#333333';
    const headingColor = '#007bff';
    const borderColor = '#cccccc';
    const fontSizeBase = 11; // Fuente base ligeramente más pequeña
    const lineHeightMultiplier = 1.2; // Espaciado entre líneas reducido
    const codeLineHeightMultiplier = 1.15; // Espaciado entre líneas de código reducido

    pdf.setTextColor(textColor);

    function addAlignedText(text, yPosition, options = {}) {
        const { size = fontSizeBase, style = 'normal', align = 'left' } = options;
        checkPageSpace(size * lineHeightMultiplier * pdf.splitTextToSize(text, (align === 'left' || align === 'right') ? contentWidth: pageWidth).length);
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
        const titleFontSize = 14; // Título de sección un poco más pequeño
        const spaceAfter = 3; // Menos espacio después del título
        const heightNeeded = titleFontSize * lineHeightMultiplier + spaceAfter;
        checkPageSpace(heightNeeded);
        pdf.setFontSize(titleFontSize);
        pdf.setFont("helvetica", 'bold');
        pdf.setTextColor(headingColor);
        const xPosition = marginHorizontal;
        pdf.text(text, xPosition, yPosition);
        pdf.setTextColor(textColor);
        return yPosition + titleFontSize * lineHeightMultiplier + spaceAfter;
    }

    function addParagraph(text, yPosition, options = {}) {
        const { size = fontSizeBase, style = 'normal', maxWidth = contentWidth, color = textColor } = options;
        pdf.setFontSize(size);
        pdf.setFont("helvetica", style);
        pdf.setTextColor(color);
        const splitText = pdf.splitTextToSize(text, maxWidth);
        checkPageSpace(splitText.length * size * lineHeightMultiplier);
        pdf.text(splitText, marginHorizontal, yPosition);
        pdf.setTextColor(textColor);
        return yPosition + splitText.length * size * lineHeightMultiplier;
    }

    function addBlockWithBackground(text, yPosition, bgColor, textColorBlock, fontName = "courier", fontSize = 9) {
        const lines = text.split('\n');
        let currentY = yPosition;
        const baseLineHeight = fontSize * codeLineHeightMultiplier;
        const paddingVertical = 4; // Ligeramente aumentado

        checkPageSpace(baseLineHeight + 2 * paddingVertical);

        let linesInCurrentPage = [];
        let firstLineInBlockSegment = true;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (firstLineInBlockSegment) {
                checkPageSpace(baseLineHeight + paddingVertical);
                currentY = y;
                firstLineInBlockSegment = false;
            }

            linesInCurrentPage.push(line);

            if (i === lines.length - 1 || (y + (linesInCurrentPage.length + 1) * baseLineHeight + paddingVertical) > (pageHeight - pageBottomMargin)) {
                const segmentHeight = linesInCurrentPage.length * baseLineHeight + 2 * paddingVertical;
                pdf.setFillColor(bgColor);
                pdf.rect(marginHorizontal, y, contentWidth, segmentHeight, 'F');

                pdf.setFont(fontName, 'normal');
                pdf.setFontSize(fontSize);
                pdf.setTextColor(textColorBlock);

                let textY = y + paddingVertical + fontSize;
                linesInCurrentPage.forEach(l => {
                    pdf.text(l, marginHorizontal + 3, textY); // Reducido padding horizontal
                    textY += baseLineHeight;
                });

                y += segmentHeight;
                linesInCurrentPage = [];

                if (i < lines.length - 1) {
                    addPageBreak();
                    currentY = y;
                    firstLineInBlockSegment = true;
                }
            }
        }
        pdf.setTextColor(textColor);
        pdf.setFont("helvetica", 'normal');
        pdf.setFontSize(fontSizeBase);
        return y;
    }

    function addCodeBlock(text, yPosition) {
        return addBlockWithBackground(text, yPosition, '#f0f0f0', '#222222');
    }

    function addOutputBlock(text, yPosition) {
        const finalY = addBlockWithBackground(text, yPosition, '#e6f7ff', '#0056b3');
        return finalY; // Asegurarse de que la función devuelva la nueva posición y
    }

    function addCheckboxResponse(text, yPosition) {
        const heightNeeded = fontSizeBase * lineHeightMultiplier + 2; // Menos espacio después
        checkPageSpace(heightNeeded);
        pdf.setFontSize(fontSizeBase);
        pdf.setFont("helvetica", 'normal');
        pdf.setFillColor(headingColor);
        pdf.rect(marginHorizontal, yPosition - (fontSizeBase * 0.6), fontSizeBase * 0.5, fontSizeBase * 0.5, 'F');
        pdf.text(text, marginHorizontal + fontSizeBase, yPosition);
        return yPosition + fontSizeBase * lineHeightMultiplier + 2;
    }

    function addTableRow(col1, col2, yPosition, isHeader = false) {
        const col1Width = contentWidth * 0.3;
        const col2Width = contentWidth * 0.7;
        const cellFontSize = isHeader ? 10 : 9; // Fuente de tabla más pequeña
        const cellLineHeight = cellFontSize * lineHeightMultiplier;
        const cellPaddingVertical = 2; // Padding vertical reducido

        pdf.setFontSize(cellFontSize);
        pdf.setFont("helvetica", isHeader ? 'bold' : 'normal');

        const col1Lines = pdf.splitTextToSize(col1, col1Width - 6); // Reducido padding
        const col2Lines = pdf.splitTextToSize(col2, col2Width - 6);
        const rowDynamicHeight = Math.max(col1Lines.length, col2Lines.length) * cellLineHeight;
        const totalRowHeight = rowDynamicHeight + 2 * cellPaddingVertical;

        checkPageSpace(totalRowHeight);

        yPosition = y;

        if (isHeader) {
            pdf.setFillColor('#e9ecef');
            pdf.rect(marginHorizontal, yPosition, contentWidth, totalRowHeight, 'F');
        }

        let textY = yPosition + cellPaddingVertical + cellFontSize;

        pdf.text(col1Lines, marginHorizontal + 3, textY); // Reducido padding
        pdf.text(col2Lines, marginHorizontal + col1Width + 3, textY);

        pdf.setDrawColor(borderColor);
        pdf.setLineWidth(0.3); // Líneas de tabla más delgadas
        pdf.rect(marginHorizontal, yPosition, col1Width, totalRowHeight);
        pdf.rect(marginHorizontal + col1Width, yPosition, col2Width, totalRowHeight);

        return yPosition + totalRowHeight;
    }

    function limpiarTextoParaPDF(texto) {
        if (typeof texto !== 'string') return '';
        let textoNormalizado = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let textoLimpio = textoNormalizado.replace(/[^\w\s.,!?"'$€£%&()\-/:;]/g, '');
        return textoLimpio.replace(/\s+/g, ' ').trim();
    }

    function addPageBreak() {
        pdf.addPage();
        y = 50;
    }

    function checkPageSpace(requiredHeight) {
        if (y + requiredHeight > pageHeight - pageBottomMargin) {
            addPageBreak();
        }
    }

    // --- Título del Documento ---
    y = addAlignedText("Resumen de Respuestas del Cuestionario", y, { size: 20, style: 'bold', align: 'center' }); // Título más pequeño
    y += 15; // Menos espacio después del título principal

    const partes = document.querySelectorAll('.container > .parte');

    partes.forEach((parte, parteIndex) => {
        const parteTituloElement = parte.querySelector('h2');
        if (parteTituloElement) {
            let tituloLimpio = limpiarTextoParaPDF(parteTituloElement.innerText);
            y = addSectionTitle(tituloLimpio, y);
        }

        const preguntas = parte.querySelectorAll('.pregunta');
        preguntas.forEach((pregunta, preguntaIndex) => {
            let preguntaTituloOriginal = pregunta.querySelector('h3')?.innerText ||
                                         pregunta.querySelector('p:first-child')?.innerText.split('\n')[0] ||
                                         `Pregunta`;
            preguntaTituloOriginal = limpiarTextoParaPDF(preguntaTituloOriginal);

            let preguntaSubtitulo = pregunta.querySelector('h3') ? (pregunta.querySelector('h3 + .descripcion, h3 + p') ) : (pregunta.querySelector('p + textarea, p + table, p + input'));
            let subEnunciado = "";
            if(pregunta.querySelector('table')){
                preguntaTituloOriginal = "";
            } else {
                checkPageSpace(fontSizeBase * lineHeightMultiplier + 2); // Menos espacio antes de la pregunta
                y = addParagraph(preguntaTituloOriginal, y, { size: fontSizeBase, style: 'bold' }); // Pregunta más pequeña
                y += 2;
            }


            const descripcionElement = pregunta.querySelector('.descripcion');
            if (descripcionElement && descripcionElement.innerText.trim()) {
                y = addParagraph(descripcionElement.innerText.trim(), y, { size: fontSizeBase - 1, style: 'italic', color: '#555555' }); // Descripción más pequeña
                y += 4; // Menos espacio después de la descripción
            }

            const codeTextarea = pregunta.querySelector('textarea[id^="code-"]');
            let codeContent = '';
            if (codeTextarea) {
                if (window.codeMirrorEditors && window.codeMirrorEditors[codeTextarea.id]) {
                    codeContent = window.codeMirrorEditors[codeTextarea.id].getValue().trim();
                } else {
                    codeContent = codeTextarea.value.trim();
                }
                if (codeContent) {
                    y += 2;
                    y = addParagraph("Código:", y, { size: fontSizeBase, style: 'bold' });
                    y += 1;
                    y = addCodeBlock(codeContent, y);
                    y += 3;
                }
            }

            let salidaPresente = false;
            const outputBox = pregunta.querySelector('.output-box');
            if (outputBox && outputBox.innerText.trim() && outputBox.innerText.trim().toLowerCase() !== 'salida aparecerá aquí...') {
                y += 16;
                y = addParagraph("Salida:", y, { size: fontSizeBase, style: 'bold' });
                y += 2;
                y = addOutputBlock(outputBox.innerText.trim(), y);
                y += 8;
                salidaPresente = true;
            }

            // Ajustar 'y' después del bloque de código, independientemente de si hay salida o no
            if (codeTextarea && codeContent) {
                // No necesitamos ajustar 'y' aquí si hay salida, ya que 'addOutputBlock' lo hace
                if (!salidaPresente) {
                    y += 8; // Añadir un espacio si solo hubo código
                }
            }

            const textInputs = pregunta.querySelectorAll('textarea.text-input');
            if (textInputs.length > 0) {
                const pElementsEnunciado = Array.from(pregunta.children).filter(el => el.tagName === 'P');
                textInputs.forEach((textInput, inputIdx) => {
                    if (textInput.value.trim()) {
                        let enunciadoPreguntaText = pElementsEnunciado[inputIdx] ? pElementsEnunciado[inputIdx].innerText.trim() : 'Respuesta:';
                        y = addParagraph(enunciadoPreguntaText, y, { size: fontSizeBase - 1, style: 'italic', color: '#444444' });
                        y += 1;
                        y = addParagraph(textInput.value.trim(), y, { size: fontSizeBase - 1 });
                        y += 4;
                    }
                });
            }

            const tabla = pregunta.querySelector('table');
            if (tabla) {
                console.log("Procesando tabla...");
                y = addTableRow("Librería", "¿Qué hace?", y, true);
                const filas = tabla.querySelectorAll('tbody tr');
                console.log(`Encontradas ${filas.length} filas en la tabla.`);
                filas.forEach((fila, idx) => {
                    const libreriaCell = fila.cells[0];
                    const queHaceCell = fila.cells[1];
                    const libreria = libreriaCell ? libreriaCell.innerText.trim() : 'N/A';
                    const queHaceInput = queHaceCell ? queHaceCell.querySelector('input[type="text"]') : null;
                    const queHace = queHaceInput ? queHaceInput.value.trim() : '';

                    console.log(`Fila <span class="math-inline">\{idx\}\: Librería\="</span>{libreria}", InputEncontrado=<span class="math-inline">\{\!\!queHaceInput\}, Respuesta\="</span>{queHace}"`);
                    y = addTableRow(libreria, queHace || '(sin respuesta)', y);
                });
                y += 4;
            }

            const checkboxes = pregunta.querySelectorAll('input[type="checkbox"]:checked');
            if (checkboxes.length > 0) {
                Array.from(checkboxes).forEach(cb => {
                    y = addCheckboxResponse(cb.parentNode.innerText.trim(), y);
                });
                y += 4; // Menos espacio después de checkboxes
            }
            if (pregunta.classList.contains('verdadero-falso')) {
                pregunta.querySelectorAll('label').forEach((label) => {
                    const inputField = label.querySelector('input.tf-input');
                    const answer = inputField ? inputField.value.trim().toUpperCase() : '';
                    let questionText = label.textContent.trim();
                    if (inputField && label.contains(inputField)) {
                        let textNodeContent = "";
                        label.childNodes.forEach(node => {
                            if (node.nodeType === Node.TEXT_NODE) {
                                textNodeContent += node.nodeValue.trim();
                            }
                        });
                        questionText = textNodeContent || questionText;
                    }
                    questionText = limpiarTextoParaPDF(questionText);
                    const preguntaVFLines = pdf.splitTextToSize(questionText, contentWidth);
                    const respuestaVFLines = pdf.splitTextToSize(`Respuesta: ${answer || '(sin respuesta)'}`, contentWidth);
                    let alturaEstimadaItemVF = (fontSizeBase * lineHeightMultiplier * 2) + 2; // Estimación más ajustada
                    if (preguntaVFLines.length > 1) alturaEstimadaItemVF += (preguntaVFLines.length -1) * fontSizeBase * lineHeightMultiplier;
                    checkPageSpace(alturaEstimadaItemVF);
                    y = addParagraph(`${questionText}`, y, { size: fontSizeBase });
                    y = addParagraph(`Respuesta: ${answer || '(sin respuesta)'}`, y, { size: fontSizeBase - 1, style: 'italic', color: '#333333' });
                    y += 3;
                });
                y += 2;
            }

            if (preguntaIndex < preguntas.length - 1) {
                checkPageSpace(8); // Menos espacio para la línea separadora
                pdf.setDrawColor(borderColor);
                pdf.setLineWidth(0.3); // Línea separadora más delgada
                pdf.line(marginHorizontal, y, pageWidth - marginHorizontal, y);
                y += 8; // Menos espacio después de la línea
            } else {
                y += 6; // Menos espacio al final de la última pregunta
            }
        });

        if (parteIndex < partes.length - 1) {
            checkPageSpace(15); // Menos espacio antes de la siguiente parte
            y += 15;
        }
    });

    pdf.save("respuestas_cuestionario.pdf");
    alert("PDF generado y descargado: respuestas_cuestionario.pdf");
}

const submitButton = document.querySelector('.submit-button');
if (submitButton) {
    submitButton.addEventListener('click', generatePDF);
} else {
    console.error("Botón de descarga no encontrado.");
}