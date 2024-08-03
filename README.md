# BinLabeler

BinLabeler is a Flask web application that generates labels for parts bins in a manufacturing or inventory environment. This application allows users to create, save, and print labels that include part numbers, quantities, and location information. It also supports color-coded workstations and handles floor stock automatically.

## Features

- **Create and manage product lines**: Organize parts by product lines.
- **Add and manage workstations**: Assign parts to workstations, with color-coding for easy identification.
- **Generate labels**: Create labels with part numbers, quantities, and workstation information.
- **Automatic floor stock detection**: Labels for floor stock parts are automatically updated with location information.
- **PDF label generation**: Export labels as a PDF file ready for printing.

## Installation

Follow these steps to set up the application locally:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/binlabeler.git
   cd binlabeler
2. ``` bash
   pip install -r requirements.txt
3. ```bash
   python app.py
4. Access the application:
Open your web browser and go to http://127.0.0.1:5000/ to access the interface.
