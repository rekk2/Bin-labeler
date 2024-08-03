from flask import Flask, render_template, request, send_file, jsonify
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
import json
import io
import os
import pandas as pd

app = Flask(__name__)

# Define the file paths where the JSON data and Excel data will be stored
PRODUCT_LINES_FILE = "product_lines.json"
WORKSTATION_DATA_FILE = "workstations.json"
FLOOR_STOCK_FILE = "floor_stock.xlsx"  # Path to your Excel file

# Helper function to save JSON data to a file
def save_json_data(file_path, data):
    with open(file_path, 'w') as file:
        json.dump(data, file, indent=2)

# Helper function to load JSON data from a file
def load_json_data(file_path):
    if os.path.exists(file_path):
        with open(file_path, 'r') as file:
            return json.load(file)
    return []

def load_floor_stock_data(filepath):
    if os.path.exists(filepath):
        df = pd.read_excel(filepath)
        df['part number'] = df['part number'].astype(str)  # Convert part numbers to strings
        floor_stock_dict = df.set_index('part number')['location'].to_dict()
        print("Loaded Floor Stock Data:", floor_stock_dict)  # Debugging output
        return floor_stock_dict
    else:
        print("Floor stock file not found.")
    return {}


@app.route("/check_floor_stock", methods=["POST"])
def check_floor_stock():
    part_number = request.json.get('part_number')
    floor_stock_data = load_floor_stock_data(FLOOR_STOCK_FILE)
    print("Checking part number:", part_number)  # Debugging output
    location = floor_stock_data.get(part_number)
    if location:
        print(f"Part number {part_number} is floor stock with location {location}")
        return jsonify({"status": "floor_stock", "location": location})
    else:
        print(f"Part number {part_number} is not floor stock.")
        return jsonify({"status": "not_floor_stock"})


@app.route("/save_workstations", methods=["POST"])
def save_workstations():
    workstations = request.json.get('workstations', [])
    existing_workstations = load_json_data(WORKSTATION_DATA_FILE)

    # Create a dictionary of the current workstations for easy lookup
    workstation_dict = {ws['name']: ws for ws in existing_workstations}

    # Update or add the new workstations, ensuring no duplicates in labels
    for ws in workstations:
        unique_labels = {}
        for label in ws['labels']:
            part_number = label['left']['part_number']
            if part_number not in unique_labels:
                unique_labels[part_number] = label
        ws['labels'] = list(unique_labels.values())
        workstation_dict[ws['name']] = ws

    # Convert back to a list
    updated_workstations = list(workstation_dict.values())

    # Save the updated workstation list
    save_json_data(WORKSTATION_DATA_FILE, updated_workstations)
    return jsonify({"status": "success", "message": "Workstations saved successfully!"})


def load_workstations():
    workstations = load_json_data(WORKSTATION_DATA_FILE)

    # Remove duplicate labels for each workstation based on left part number
    for workstation in workstations:
        unique_labels = {}
        for label in workstation['labels']:
            part_number = label['left']['part_number']
            if part_number not in unique_labels:
                unique_labels[part_number] = label
        # Replace the labels with only unique ones
        workstation['labels'] = list(unique_labels.values())

    return jsonify({"status": "success", "workstations": workstations})

@app.route("/save_product_lines", methods=["POST"])
def save_product_lines():
    product_lines = request.json.get('product_lines', [])
    save_json_data(PRODUCT_LINES_FILE, product_lines)
    return jsonify({"status": "success", "message": "Product lines saved successfully!"})

@app.route("/get_product_lines", methods=["GET"])
def get_product_lines():
    product_lines = load_json_data(PRODUCT_LINES_FILE)
    return jsonify({"status": "success", "product_lines": product_lines})

@app.route("/get_workstations/<product_line>", methods=["GET"])
def get_workstations(product_line):
    workstations = load_json_data(WORKSTATION_DATA_FILE)
    filtered_workstations = [ws for ws in workstations if ws['product_line'] == product_line]
    return jsonify({"status": "success", "workstations": filtered_workstations})

def create_label_pdf(labels_data):
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=landscape(letter))
    
    # Load the floor stock data
    floor_stock_data = load_floor_stock_data(FLOOR_STOCK_FILE)

    # Clean labels_data to remove any null or empty labels
    labels_data = [label for label in labels_data if label['left']['part_number'] or label['right']['part_number']]
    
    # Define label dimensions and orientation
    label_width = 3 * inch
    label_height = 1 * inch

    # Margins and spacing
    left_margin = 0.5 * inch
    top_margin = 0.5 * inch
    vertical_spacing = 0.1 * inch
    horizontal_spacing = 0.1 * inch

    # Calculate number of labels per row and column based on landscape orientation
    labels_per_row = int((landscape(letter)[0] - 2 * left_margin + horizontal_spacing) / (label_width + horizontal_spacing))
    labels_per_column = int((landscape(letter)[1] - 2 * top_margin + vertical_spacing) / (label_height + vertical_spacing))

    x_start = left_margin
    y_start = landscape(letter)[1] - top_margin

    x_position = x_start
    y_position = y_start

    for idx, label in enumerate(labels_data):
        # Check if we need to move to the next row
        if (idx % labels_per_row) == 0 and idx != 0:
            x_position = x_start
            y_position -= (label_height + vertical_spacing)
        
        # Check if we need to move to the next page
        if (idx % (labels_per_row * labels_per_column)) == 0 and idx != 0:
            c.showPage()  # Move to the next page
            y_position = y_start  # Reset y_position to start at the top of the page
            x_position = x_start  # Reset x_position to start at the left margin

        # Determine if the part is floor stock
        part_number_left = label['left']['part_number']
        floor_stock_location_left = floor_stock_data.get(part_number_left)

        if floor_stock_location_left:
            label['left']['quantity'] = f"FS-{floor_stock_location_left}"

        # Determine if the part on the right is floor stock
        part_number_right = label['right']['part_number']
        floor_stock_location_right = floor_stock_data.get(part_number_right)

        if floor_stock_location_right:
            label['right']['quantity'] = f"FS-{floor_stock_location_right}"

        # Draw the 3"x1" label rectangle
        c.rect(x_position, y_position - label_height, label_width, label_height, stroke=1, fill=0)
        
        draw_label_content(c, label['left'], x_position + 0.2 * inch, y_position - 0.3 * inch, label_width, label_height, is_right_side=False)
        draw_label_content(c, label['right'], x_position + 1.6 * inch, y_position - 0.3 * inch, label_width, label_height, is_right_side=True)
        
        # Move to the next column
        x_position += (label_width + horizontal_spacing)

    c.save()
    packet.seek(0)
    return packet



def draw_label_content(c, label_side, x_position, y_position, label_width, label_height, is_right_side=False):
    part_number = label_side.get('part_number', '') or ''
    alt_part_number = label_side.get('alt_part_number', '') or ''
    quantity = label_side.get('quantity', '') or ''
    a_frame_location = label_side.get('a_frame_location', '') or ''
    workstation_name = label_side.get('workstation_name', '') or ''
    workstation_color = label_side.get('workstation_color', '#FFFFFF')  # Default color is white if not specified

    # Ensure text is always black
    c.setFillColor("black")

    # Determine font size for part number
    part_number_length = len(part_number)
    if part_number_length > 14:
        part_number_font_size = 9
    elif part_number_length > 12:
        part_number_font_size = 11
    else:
        part_number_font_size = 13

    # Determine font size for alternate part number
    alt_part_number_length = len(alt_part_number)
    if (alt_part_number_length > 14):
        alt_part_number_font_size = 9
    elif alt_part_number_length > 12:
        alt_part_number_font_size = 11
    else:
        alt_part_number_font_size = 13

    other_text_font_size = 10

    # Start the content higher up by adjusting the y_position
    initial_y_position = y_position + 0.13 * inch

    # Draw the part number at the top with dynamically adjusted font size
    c.setFont("Helvetica-Bold", part_number_font_size)
    c.drawString(x_position, initial_y_position, str(part_number))

    if alt_part_number:
        c.setFont("Helvetica-Bold", alt_part_number_font_size)
        c.drawString(x_position, initial_y_position - 0.19 * inch, str(alt_part_number))

    # Check if the quantity is prefixed with "FS-" to determine if it's floor stock
    if quantity.startswith("FS-"):
        display_text = quantity  # Already formatted as "FS-Location"
    else:
        display_text = f"Qty: {quantity}"

    # Ensure that the "Qty" or "FS" label is displayed if there is a part number
    if part_number and quantity:
        c.setFont("Helvetica", other_text_font_size)
        c.drawString(x_position, initial_y_position - 0.36 * inch, str(display_text))
    
    # Draw the A-frame location below the quantity or FS label
    if a_frame_location:
        c.setFont("Helvetica", other_text_font_size)
        c.drawString(x_position, initial_y_position - 0.53 * inch, str(a_frame_location))

    # Only draw the workstation name and color if this is the left side (not the right side)
    if not is_right_side:
        # Set a specific font size for the workstation name
        workstation_name_font_size = 10
        c.setFont("Helvetica-Bold", workstation_name_font_size)
        
        # Adjust the vertical position for the workstation name
        c.drawString(x_position, initial_y_position - 0.71 * inch, f"WS-{str(workstation_name)}")

        # Draw the colored rectangle at the bottom of the label
        c.setFillColor(workstation_color)

        # Calculate the correct x and y positions for the rectangle
        rect_x_position = x_position + (label_width - .8 * inch) / 2  # Center the rectangle horizontally within the label
        rect_y_position = y_position - label_height + 0.15 * inch + 0.17 * inch  # Positioned near the bottom inside the label and raised by 0.25 inches

        # Draw the rectangle 
        c.rect(rect_x_position, rect_y_position, .6 * inch, 0.12 * inch, stroke=0, fill=1)

    # Set the color back to black for any subsequent text
    c.setFillColor("black")




@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        labels_data = request.json.get('labels_data', [])
        pdf_data = create_label_pdf(labels_data)
        return send_file(pdf_data, as_attachment=True, download_name="labels.pdf", mimetype="application/pdf")
    
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)

