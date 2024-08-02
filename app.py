from flask import Flask, render_template, request, send_file, jsonify
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
import io

app = Flask(__name__)

def create_label_pdf(labels_data):
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=landscape(letter))
    
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

    for idx, label in enumerate(labels_data):
        row = idx // labels_per_row
        col = idx % labels_per_row

        x_position = x_start + col * (label_width + horizontal_spacing)
        y_position = y_start - row * (label_height + vertical_spacing)

        if row >= labels_per_column:
            c.showPage()
            x_position = left_margin
            y_position = y_start - 0 * (label_height + vertical_spacing)
            row = 0

        # Draw the 3"x1" label rectangle
        c.rect(x_position, y_position - label_height, label_width, label_height, stroke=1, fill=0)
        
        # Draw text for the left and right sides of the label
        draw_label_content(c, label['left'], x_position + 0.2 * inch, y_position - 0.3 * inch)
        draw_label_content(c, label['right'], x_position + 1.6 * inch, y_position - 0.3 * inch)

    c.save()
    packet.seek(0)
    return packet

def draw_label_content(c, label_side, x_position, y_position):
    part_number = label_side.get('part_number', '')
    alt_part_number = label_side.get('alt_part_number', '')
    quantity = label_side.get('quantity', '')
    a_frame_location = label_side.get('a_frame_location', '')

    c.setFont("Helvetica", 10)
    c.drawString(x_position, y_position, part_number)

    if alt_part_number:
        c.setFont("Helvetica", 8)
        c.drawString(x_position, y_position - 0.15 * inch, alt_part_number)

    c.setFont("Helvetica", 8)
    c.drawString(x_position, y_position - 0.3 * inch, f"Qty: {quantity}")
    c.drawString(x_position, y_position - 0.45 * inch, a_frame_location)

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        labels_data = request.json.get('labels_data', [])
        pdf_data = create_label_pdf(labels_data)
        return send_file(pdf_data, as_attachment=True, download_name="labels.pdf", mimetype="application/pdf")

    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)
