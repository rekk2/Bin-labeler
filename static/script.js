let productLines = [];
let workstations = [];

// Function to add a product line
function addProductLine() {
    const productLineName = prompt("Enter Product Line Name:");
    if (productLineName) {
        productLines.push(productLineName);
        renderProductLines();
        saveProductLines();  
    }
}

// Function to render the product lines
function renderProductLines() {
    const container = document.getElementById('product_lines');
    container.innerHTML = '';

    const select = document.getElementById('product_line_select');
    select.innerHTML = '<option value="">Select Product Line</option>';

    productLines.forEach(line => {
        const div = document.createElement('div');
        div.classList.add('product-line');

        const heading = document.createElement('h4');
        heading.textContent = line;

        div.appendChild(heading);
        container.appendChild(div);

        const option = document.createElement('option');
        option.value = line;
        option.textContent = line;
        select.appendChild(option);
    });
}

function searchPartNumber() {
    const partNumber = document.getElementById('search_part_number').value.trim();
    if (partNumber) {
        fetch('/search_part', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ part_number: partNumber }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                let resultsHtml = 'Search Results:\n\n';
                data.results.forEach(result => {
                    resultsHtml += `Product Line: ${result.product_line}\n`;
                    resultsHtml += `Workstation: ${result.workstation_name}\n`;
                    resultsHtml += `A-Frame Location: ${result.a_frame_location}\n`;
                    resultsHtml += `Side: ${result.side}\n\n`;
                });
                alert(resultsHtml); 
            } else {
                alert(data.message); 
            }
        })
        .catch(error => console.error('Error:', error));
    } else {
        alert("Please enter a part number to search.");
    }
}



// Function to save the product lines to the server
function saveProductLines() {
    fetch('/save_product_lines', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_lines: productLines }),
    })
    .then(response => response.json())
    .then(data => {
        console.log("Product lines saved:", data.message);
    })
    .catch(error => console.error('Error:', error));
}

// Function to load workstations for a selected product line
function loadWorkstationsForProductLine() {
    const productLine = document.getElementById('product_line_select').value;
    if (productLine) {
        fetch(`/get_workstations/${productLine}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                workstations = data.workstations;
                renderWorkstations();
                renderWorkstationDropdown();
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

// Unified Function to Render the Workstations with Color and Editing Capabilities
function renderWorkstations() {
    const container = document.getElementById('workstations');
    container.innerHTML = '';

    workstations.forEach((workstation, index) => {
        const div = document.createElement('div');
        div.classList.add('workstation');

        const heading = document.createElement('h3');
        heading.textContent = `${workstation.name} (${workstation.product_line})`;

        const colorBox = document.createElement('input');
        colorBox.type = 'color';
        colorBox.value = workstation.color;
        colorBox.className = 'color-box';
        colorBox.style.width = '40px';
        colorBox.style.height = '40px';
        colorBox.onchange = (event) => {
            workstations[index].color = event.target.value;
            saveWorkstations();
        };

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit Name';
        editButton.onclick = () => editWorkstation(index);

        div.appendChild(heading);
        div.appendChild(colorBox);
        div.appendChild(editButton);

        container.appendChild(div);
    });
}

// Function to render the workstation dropdown
function renderWorkstationDropdown() {
    const select = document.getElementById('workstation_select');
    select.innerHTML = '<option value="">Select Workstation</option>';

    workstations.forEach(workstation => {
        const option = document.createElement('option');
        option.value = workstation.name;
        option.textContent = `${workstation.name} (${workstation.product_line})`;
        select.appendChild(option);
    });

    if (workstations.length > 0) {
        loadPartsForWorkstation(workstations[0].name);
    }

    select.addEventListener('change', function() {
        const selectedWorkstation = select.value;
        loadPartsForWorkstation(selectedWorkstation);
    });
}

// Function to clear the workstation form
function clearWorkstationForm() {
    document.getElementById('workstation_name').value = '';
    document.getElementById('workstation_color').value = '#ff0000'; // Reset color picker
}

// Function to add a workstation
function addWorkstation() {
    const workstationName = document.getElementById('workstation_name').value.trim();
    const workstationColor = document.getElementById('workstation_color').value; // Get the color
    const productLine = document.getElementById('product_line_select').value;

    if (workstationName && productLine) {
        const workstation = {
            name: workstationName,
            product_line: productLine,
            color: workstationColor, // Save the selected color
            labels: []
        };
        workstations.push(workstation);
        renderWorkstations();
        renderWorkstationDropdown();
        saveWorkstations();
        clearWorkstationForm(); // Clear the form after adding
    } else {
        alert("Please enter a workstation name and select a product line.");
    }
}

// Function to edit a workstation
function editWorkstation(index) {
    const newName = prompt("Edit Workstation Name:", workstations[index].name);
    if (newName) {
        workstations[index].name = newName;
        renderWorkstations();
        renderWorkstationDropdown();
        saveWorkstations();
    }
}

// Function to save the workstations to the server
function saveWorkstations() {
    fetch('/save_workstations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workstations }),
    })
    .then(response => response.json())
    .then(data => {
        console.log("Workstations saved:", data.message);
    })
    .catch(error => console.error('Error:', error));
}

// Function to load workstations from the server
function loadWorkstations() {
    fetch('/load_workstations')
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            workstations = data.workstations;
            renderWorkstations();
            renderWorkstationDropdown();
        }
    })
    .catch(error => console.error('Error:', error));
}

// Function to ensure unique part numbers
function ensureUniqueLabels(labelsData) {
    const uniqueLabels = [];
    const seenParts = new Set();

    labelsData.forEach(label => {
        if (!seenParts.has(label.left.part_number)) {
            uniqueLabels.push(label);
            seenParts.add(label.left.part_number);
        } else {
            console.warn(`Duplicate part number detected and removed: ${label.left.part_number}`);
        }
    });

    return uniqueLabels;
}

// Function to check if a part number is floor stock
function checkIfFloorStock(partNumber, callback) {
    console.log("Checking if part number is floor stock:", partNumber);  // Debugging output
    fetch('/check_floor_stock', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ part_number: partNumber }),
    })
    .then(response => response.json())
    .then(data => {
        console.log("Received response from server:", data);  // Debugging output
        if (data.status === 'floor_stock') {
            callback(`FS-${data.location}`);
        } else {
            callback(null);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        callback(null);
    });
}

// Function to add an individual part
function addIndividualPart() {
    const partNumber = document.getElementById('single_part_number').value.trim();
    const selectedWorkstation = document.getElementById('workstation_select').value;
    if (partNumber !== '' && selectedWorkstation) {
        checkIfFloorStock(partNumber, (floorStockLocation) => {
            addPartFields(partNumber, selectedWorkstation, floorStockLocation);
            document.getElementById('single_part_number').value = ''; 
            saveWorkstations(); 
        });
    } else {
        alert("Please select a workstation and enter a part number.");
    }
}

// Function to generate fields from a list of part numbers
function generateFieldsFromList() {
    const partNumbers = document.getElementById('part_numbers').value.split('\n');
    const selectedWorkstation = document.getElementById('workstation_select').value;
    if (selectedWorkstation) {
        partNumbers.forEach(partNumber => {
            if (partNumber.trim() !== '') {
                checkIfFloorStock(partNumber.trim(), (floorStockLocation) => {
                    addPartFields(partNumber.trim(), selectedWorkstation, floorStockLocation);
                });
            }
        });
        saveWorkstations(); 
    } else {
        alert("Please select a workstation.");
    }
}
function loadPartsForWorkstation(workstationName) {
    const workstation = workstations.find(ws => ws.name === workstationName);
    if (workstation) {
        const container = document.querySelector('.dynamic-fields');
        container.innerHTML = ''; 

        const filteredLabels = filterUniqueLabels(filterNullLabels(workstation.labels));

        filteredLabels.forEach(label => {
            // Check if the part number is already added to the container
            if (!container.querySelector(`input[name="left_part_number_${label.left.part_number}"]`)) {
                checkIfFloorStock(label.left.part_number, (floorStockLocation) => {
                    addPartFields(
                        label.left.part_number,
                        workstationName,
                        floorStockLocation,
                        {
                            left: {
                                part_number: label.left.part_number,
                                alt_part_number: label.left.alt_part_number,
                                quantity: floorStockLocation ? floorStockLocation : label.left.quantity,
                                a_frame_location: label.left.a_frame_location,
                            },
                            right: {
                                part_number: label.right.part_number,
                                alt_part_number: label.right.alt_part_number,
                                quantity: label.right.quantity,
                                a_frame_location: label.right.a_frame_location,
                            }
                        }
                    );
                });
            }
        });
    }
}

// Function to filter out unique labels based on part numbers
function filterUniqueLabels(labels) {
    const uniqueLabels = [];
    const seenParts = new Set();

    labels.forEach(label => {
        if (!seenParts.has(label.left.part_number)) {
            uniqueLabels.push(label);
            seenParts.add(label.left.part_number);
        }
    });

    return uniqueLabels;
}


// Function to add part fields for both left and right sides
function addPartFields(partNumber, workstationName, floorStockLocation, partData = {}) {
    const container = document.querySelector('.dynamic-fields');

    const div = document.createElement('div');
    div.classList.add('form-group');

    const partLabel = document.createElement('h4');
    partLabel.textContent = `Part Number: ${partNumber}`;
    div.appendChild(partLabel);

    const leftData = partData.left || {};
    const rightData = partData.right || {};

    const leftQtyValue = floorStockLocation ? floorStockLocation : leftData.quantity || '';
    const leftQtyReadonly = floorStockLocation ? 'readonly' : '';

    const leftDiv = document.createElement('div');
    leftDiv.innerHTML = `<label>Left Side</label>
        <input type="text" name="left_part_number_${partNumber}" placeholder="Part Number" value="${leftData.part_number || partNumber}" readonly>
        <input type="text" name="left_alt_${partNumber}" placeholder="Alt Part Number" value="${leftData.alt_part_number || ''}">
        <input type="text" name="left_qty_${partNumber}" placeholder="Quantity" value="${leftQtyValue}" ${leftQtyReadonly}>
        <input type="text" name="left_location_${partNumber}" placeholder="A-Frame Location" value="${leftData.a_frame_location || ''}">
        <input type="text" name="left_workstation_name_${partNumber}" value="${workstationName}" placeholder="Workstation Name" readonly>`;

    const rightDiv = document.createElement('div');
    rightDiv.innerHTML = `<label>Right Side</label>
        <input type="text" name="right_part_number_${partNumber}" placeholder="Part Number" value="${rightData.part_number || ''}" onblur="handleRightPartNumberChange(event)">
        <input type="text" name="right_alt_${partNumber}" placeholder="Alt Part Number" value="${rightData.alt_part_number || ''}">
        <input type="text" name="right_qty_${partNumber}" placeholder="Quantity" value="${rightData.quantity || ''}">
        <input type="text" name="right_location_${partNumber}" placeholder="A-Frame Location" value="${rightData.a_frame_location || ''}">`;

    // Up and Down buttons
    const upButton = document.createElement('button');
    upButton.textContent = 'Up';
    upButton.style.padding = '2px 6px';
    upButton.onclick = (event) => moveLabelUp(event, div);

    const downButton = document.createElement('button');
    downButton.textContent = 'Down';
    downButton.style.padding = '2px 6px';
    downButton.onclick = (event) => moveLabelDown(event, div);

    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.style.padding = '2px 6px';  // Smaller button size
    deleteButton.onclick = () => {
        container.removeChild(div);
        saveWorkstations();
    };

    const buttonDiv = document.createElement('div');
    buttonDiv.appendChild(upButton);
    buttonDiv.appendChild(downButton);
    buttonDiv.appendChild(deleteButton);

    div.appendChild(leftDiv);
    div.appendChild(rightDiv);
    div.appendChild(buttonDiv);

    container.appendChild(div);
}

// Function to move a label up in the list
function moveLabelUp(event, element) {
    event.preventDefault(); // Prevent form submission
    event.stopPropagation(); // Stop the click from bubbling up

    const previousElement = element.previousElementSibling;
    if (previousElement) {
        element.parentNode.insertBefore(element, previousElement);
        saveWorkstations(); // Save the new order
    }
}

// Function to move a label down in the list
function moveLabelDown(event, element) {
    event.preventDefault(); // Prevent form submission
    event.stopPropagation(); // Stop the click from bubbling up

    const nextElement = element.nextElementSibling;
    if (nextElement) {
        element.parentNode.insertBefore(nextElement, element);
        saveWorkstations(); // Save the new order
    }
}

// Function to collect form data and ensure uniqueness
function collectFormData() {
    const form = document.querySelector('#label-form');
    const formData = new FormData(form);
    let labelsData = [];

    const partNumbers = document.getElementById('part_numbers').value.split('\n').concat(
        Array.from(document.querySelectorAll('input[name^="left_part_number_"]')).map(input => input.value)
    ).filter(Boolean);

    partNumbers.forEach(partNumber => {
        const workstation = workstations.find(ws => ws.name === formData.get(`left_workstation_name_${partNumber}`));
        labelsData.push({
            left: {
                part_number: formData.get(`left_part_number_${partNumber}`),
                alt_part_number: formData.get(`left_alt_${partNumber}`),
                quantity: formData.get(`left_qty_${partNumber}`),
                a_frame_location: formData.get(`left_location_${partNumber}`),
                workstation_name: formData.get(`left_workstation_name_${partNumber}`),
                workstation_color: workstation ? workstation.color : '#FFFFFF' // Include the color
            },
            right: {
                part_number: formData.get(`right_part_number_${partNumber}`),
                alt_part_number: formData.get(`right_alt_${partNumber}`),
                quantity: formData.get(`right_qty_${partNumber}`),
                a_frame_location: formData.get(`right_location_${partNumber}`),
            }
        });
    });

    // Ensure uniqueness before returning
    labelsData = ensureUniqueLabels(labelsData);

    return labelsData;
}

// Function to handle changes to the right part number input
function handleRightPartNumberChange(event) {
    const input = event.target;
    const partNumber = input.value.trim();
    if (partNumber) {
        checkIfFloorStock(partNumber, (floorStockLocation) => {
            const qtyInput = input.parentNode.querySelector(`input[name^="right_qty_"]`);
            if (floorStockLocation) {
                qtyInput.value = floorStockLocation;
                qtyInput.setAttribute('readonly', true);
            } else {
                qtyInput.removeAttribute('readonly');
            }
        });
    }
}

// Function to filter out null or undefined labels
function filterNullLabels(labelsData) {
    return labelsData.filter(label => label && label.left && label.left.part_number);
}

// Function to save labels to the server
function saveLabels() {
    let labelsData = collectFormData();
    labelsData = ensureUniqueLabels(labelsData); // Ensure labels are unique
    labelsData = filterNullLabels(labelsData); // Filter out null labels

    const selectedWorkstation = document.getElementById('workstation_select').value;
    
    if (selectedWorkstation) {
        const workstation = workstations.find(ws => ws.name === selectedWorkstation);
        if (workstation) {
            workstation.labels = labelsData;
            saveWorkstations();
            alert('Labels saved successfully!');
        }
    } else {
        alert("Please select a workstation.");
    }
}

// Event listener for form submission
document.getElementById('label-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const labelsData = collectFormData();
    
    fetch('/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ labels_data: labelsData }),
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'labels.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    })
    .catch(error => console.error('Error:', error));
});

// Event listener for DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    fetch('/get_product_lines')
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            productLines = data.product_lines;
            renderProductLines();
            loadWorkstations(); 
        }
    })
    .catch(error => console.error('Error:', error));
});
