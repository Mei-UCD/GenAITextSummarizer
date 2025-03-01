const textArea = document.getElementById("textToSummarize");
const submitButton = document.getElementById("submitBtn");
const clearButton = document.getElementById("clearBtn");
const uploadButton = document.getElementById("uploadBtn");
const wordCount = document.getElementById("wordCount");
const fileUpload = document.getElementById("file-upload");
const summarizedTextArea = document.getElementById("summary");
const summarizedWordCount = document.getElementById("summarizedWordCount");

const footer = document.querySelector(".text-box-footer");

submitButton.disabled = true;

textArea.addEventListener("input", inputText);
fileUpload.addEventListener("change", handleFileUpload);
submitButton.addEventListener("click", submitData);
clearButton.addEventListener("click", clearText);

const MAX_TEXT_LENGTH = 15000;

function inputText(e){
    /* Autoset the height of textarea */
    textArea.style.height = "auto";
    textArea.style.height = textArea.scrollHeight + "px";
    /* Limit the length of input text */
    if (textArea.value.length > MAX_TEXT_LENGTH) {
        textArea.value = textArea.value.substring(0, MAX_TEXT_LENGTH);
    }
    /* Verify the TextArea value length */
    if (textArea.value.length> 200 && textArea.value.length <= MAX_TEXT_LENGTH){
        submitButton.disabled = false;
    }else{
        submitButton.disabled = true;
    }

    /* Set the clear button */
    if (textArea.value.trim() !== ""){
        clearButton.style.display = 'block';
        uploadButton.style.display = "none";
        footer.classList.add("has-text");
    }else{
        clearButton.style.display = 'none';
        uploadButton.style.display = "inline";
        footer.classList.remove("has-text");
    }

    /* Get the text and the word counts */
    const text = textArea.value.trim();
    const textWordCount = text.split(/\s+/).filter(word => word).length;

    /* Deal with the buttons which no need to display */
    if (text.trim() === "") {
        wordCount.style.display = "none";  // Hide word count when text is empty
    } else {
        wordCount.style.display = "inline";  // Show word count when text is not empty
        wordCount.textContent = `${textWordCount} words`;
    }
}

function handleFileUpload(e){
    const file = e.target.files[0];
    if (file){
        const formData = new FormData();
        formData.append("file", file);

        fetch("/upload_file",{
            method:'POST',
            body: formData
        })
        .then(response=>response.json())
        .then(data => {
            if (data.extracted_text){
                textArea.value = data.extracted_text;

                if (textArea.value.length > MAX_TEXT_LENGTH) {
                    textArea.value = textArea.value.substring(0, MAX_TEXT_LENGTH);
                }

                const text = textArea.value.trim();
                const textWordCount = text.split(/\s+/).filter(word => word).length;
                inputText();

                wordCount.style.display = "inline";
                wordCount.textContent = `${textWordCount} words`;
                uploadButton.style.display = "none";

                submitData();
            }else{
                console.error("No extracted text found in response!");
            }
        })
        .catch(error => {
            console.error("Error:", error);
        });
    }
}


function submitData(e){
    e.preventDefault();
    // This is used to add animation to the submit button
    submitButton.classList.add("submit-button--loading");

    const text_to_summarize = textArea.value.trim();

    if (!text_to_summarize){
        alert("Please input text or upload files!");
        submitButton.classList.remove("submit-button--loading");
        return;
    }

    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({"text_to_summarize": text_to_summarize});

    var requestOptions ={
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };

    fetch("/summarize", requestOptions)
    .then(response => response.json())
    .then(data => {

        summarizedTextArea.value = data.summary;
        const summarizedTextCount = summarizedTextArea.value.split(/\s+/).filter(word => word).length;
        summarizedWordCount.style.display = "inline";
        summarizedWordCount.textContent = `${summarizedTextCount} words`;

        submitButton.classList.remove("submit-button--loading");
    })
    .catch(error => {
        console.log(error.message);
        submitButton.classList.remove("submit-button--loading");
    })
}

function clearText(){
    textArea.value = "";
    clearButton.style.display = "none";
    wordCount.style.display = "none";
    summarizedWordCount.style.display = "none";
    uploadButton.style.display = "inline";

    summarizedTextArea.value = "";
    fileUpload.value = "";
    submitButton.disabled = true;

    textArea.style.height = "300px";
    footer.classList.remove("has-text");

    // Send request to backend to clear stored file data
    fetch("/clear-file", {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'clear'})
    })
    .then(response => response.json())
    .then(data => console.log("File cleared on backend:", data))
    .catch(error => console.error("Error clearing file:", error));
}


