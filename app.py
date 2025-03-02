import os
import sys
import openai
from PyPDF2 import PdfReader
from docx import Document
from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv


app = Flask(__name__)

load_dotenv()
openai_api_key = os.getenv("apikey")
# Set the OPENAI API
openai.api_key = openai_api_key
client = openai.OpenAI(
    # defaults to os.environ.get("OPENAI_API_KEY")
    api_key=openai.api_key,
    #api_key="YOUR API KEY",
    # base_url="https://api.chatanywhere.tech/v1"
    base_url="https://api.chatanywhere.org/v1"
)

UPLOAD_FOLDER = "./uploads"
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/upload_file", methods=["POST"])
def upload_file():
    try:
        text = ""
        if 'file' in request.files:
            file = request.files["file"]

            if not os.path.exists(UPLOAD_FOLDER):
                os.makedirs(UPLOAD_FOLDER)
            filepath = os.path.join(UPLOAD_FOLDER, file.filename)
            file.save(filepath)
            print(f"File saved to: {filepath}")

            # Extract Text Based on file type
            if file.filename.endswith(".pdf"):
                text = extract_text_from_pdf(filepath)
            elif file.filename.endswith(".docx"):
                text = extract_text_from_docx(filepath)
            elif file.filename.endswith(".txt"):
                with open(filepath, "r", encoding="utf-8") as f:
                    text = f.read()
            else:
                return jsonify({"error": "Unsupported file type"}),400
        # Clean up after processing
        os.remove(filepath)
        return jsonify({"extracted_text": text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/summarize", methods=["POST"])
def summarize():
    try:
        data = request.get_json()
        text = data.get("text_to_summarize", "").strip()

        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        # Use OpenAI API Model
        response = client.chat.completions.create(
            model = "gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful text summarizer."},
                {"role": "user", "content": f"Summarize the following text:\n\n{text}"}
            ],
            max_tokens = 1000,
            temperature=0.3,
            top_p=0.5
        )
        summary = response.choices[0].message.content.strip()
        print(f"Summary generated: {summary}", file=sys.stderr)

        return jsonify({"summary": summary})

    except Exception as e:
        print(f"OpenAI API error: {e}", file=sys.stderr, flush=True)
        return jsonify({"error": str(e)}), 500

@app.route('/clear-file', methods=['POST'])
def clear_file():
    try:
        if os.path.exists(UPLOAD_FOLDER):
            for file_name in os.listdir(UPLOAD_FOLDER):
                file_path = os.path.join(UPLOAD_FOLDER, file_name)
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    print(f"✅ File removed: {file_path}")
        return jsonify({'message': 'File and summary cleared'}), 200
    except Exception as e:
        print(f"❌ Error clearing file: {e}")
        return jsonify({'error': str(e)}), 500

def extract_text_from_pdf(filepath):
    reader = PdfReader(filepath)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text

def extract_text_from_docx(filepath):
    doc = Document(filepath)
    text = ""
    for paragraph in doc.paragraphs:
        text += paragraph.text + "\n"
    return text


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
