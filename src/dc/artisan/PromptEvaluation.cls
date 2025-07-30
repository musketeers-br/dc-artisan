/// todo: take this code into .py files
Class dc.artisan.PromptEvaluation Extends %RegisteredObject
{

ClassMethod ExecuteTestPrompt(provider, dataset, prompt, metrics, llm) [ Language = python ]
{
from ragas import SingleTurnSample, EvaluationDataset
from ragas import evaluate

import os
import ast

def ask_to_llm(llm, prompt, sentence, idx):
    from langchain_core.messages import HumanMessage, SystemMessage
    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content=sentence),
    ]
    response = llm.invoke(messages)
    return response.content

# parse the CSV data into samples
dataset_csv = dataset.replace("\t\t", "")
from io import StringIO
import pandas as pd
from ragas.dataset_schema import SingleTurnSample
df = pd.read_csv(StringIO(dataset_csv))
samples = [
    SingleTurnSample(
        user_input=row['user_input'],
        reference=row['reference'],
        response=ask_to_llm(llm, prompt, row['user_input'], i),
    ) for i, row in df.iterrows()
]

eval_dataset = EvaluationDataset(samples)
results = evaluate(eval_dataset, metrics)
results_df = results.to_pandas()

totals_dict = ast.literal_eval(str(results))
metrics = [
    {"name": metric.name, "label": metric.name} 
    for metric in metrics]

return [
    totals_dict,
    results_df,
    metrics
]
}

ClassMethod GetLLM(provider) [ Language = python ]
{
from langchain_openai import ChatOpenAI
from ragas.llms import LangchainLLMWrapper

import os

# check expected providers
supportedProvider = ["chatgpt"]
if provider not in ["chatgpt"]:
    raise ValueError(f"Unsupported provider. Supported providers are: {supportedProvider}")

# check if the environment variable is set
if provider == "chatgpt" and "OPENAI_API_KEY" not in os.environ:
    raise ValueError("OPENAI_API_KEY environment variable is not set")

# todo: let users select provider and model in the extension
provider_model = "gpt-4o-mini"

llm = ChatOpenAI(model=provider_model, temperature=0.0)
evaluator_llm = LangchainLLMWrapper(llm)

return [llm, evaluator_llm]
}

ClassMethod GetEvaluationMetrics(llmEvaluator) [ Language = python ]
{

# todo: let users select metrics in the extension

from ragas.metrics import BleuScore
from ragas.metrics import SimpleCriteriaScore

metrics = [
    BleuScore(),

    SimpleCriteriaScore(
        name="similarity_score", 
        definition='''
Score the similarity between the response and the reference on a scale from 0 to 100, where:

- 100 = Perfect match or paraphrase

- 50 = Partial overlap

- 0 = No similarity

Return only a number between 0 and 100. 
Do not output text, explanations, invalid numbers or NaN.

Example format:
Score: 85
        ''',
        llm=llmEvaluator
    ),

#     SimpleCriteriaScore(
#         name="no_suggestions_or_diagnoses", 
#         definition='''
# Classify the summary of a patient's report using the following rule:
# 
# Return 1 if the summary only describes symptoms or observations (no interpretations or diagnoses).
# 
# Return 0 if the summary includes any diagnostic suggestion, interpretation, or possible cause, even indirectly.
# 
# Examples:
# 
# - "Persistent fatigue, unexplained weight gain, and sensitivity to cold." → 1
# 
# - "Fatigue and weight gain; possible hypothyroidism." → 0
# 
# Only return 0 or 1 as output.
#         ''',
#         llm=llmEvaluator
#     ),
]

return metrics
}

ClassMethod GenerateHtmlReport(resultsDataframe, totalsDict, metrics) [ Language = python ]
{
import pandas as pd
import json

def generate_prompt_test_report_html(df: pd.DataFrame, totals: dict, metrics: list[dict]) -> str:
    df_json = df.to_dict(orient="records")
    df_json_str = json.dumps(df_json)
    metrics_display = "\n".join(
        f'<li><strong>{m["label"]}:</strong> {totals.get(m["name"], "N/A")}</li>'
        for m in metrics
    )

    html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Prompt Tuning Test Report</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f9f9f9;
        }}
        h1 {{
            text-align: center;
        }}
        .totals {{
            background: #f0f0f0;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 20px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }}
        th, td {{
            border: 1px solid #ccc;
            padding: 8px;
            vertical-align: top;
            text-align: left;
        }}
        th {{
            background-color: #eee;
        }}
        tr:nth-child(even) {{background-color: #f9f9f9;}}
        input[type="text"] {{
            width: 100%;
            padding: 8px;
            margin-bottom: 10px;
            box-sizing: border-box;
        }}
        .pagination {{
            margin-top: 10px;
            text-align: center;
        }}
        .pagination button {{
            padding: 5px 10px;
            margin: 2px;
            background-color: #0077cc;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }}
        .pagination button.disabled {{
            background-color: #ccc;
            cursor: default;
        }}
    </style>
</head>
<body>
    <h1>Prompt Tuning Test Report</h1>

    <div class="totals">
        <h2>Aggregate Metrics</h2>
        <ul>
            {metrics_display}
        </ul>
    </div>

    <input type="text" id="searchInput" placeholder="Search by user input, response, or reference...">

    <table id="resultsTable">
        <thead>
            <tr>
                <th>User Input</th>
                <th>LLM Response</th>
                <th>Reference</th>
                <!-- Metric columns will be injected here -->
                {''.join(f'<th>{m["label"]}</th>' for m in metrics)}
            </tr>
        </thead>
        <tbody></tbody>
    </table>

    <div class="pagination" id="pagination"></div>

    <script>
        const data = {df_json_str};
        let currentPage = 1;
        const rowsPerPage = 10;

        function renderTable(filterText = "", page = 1) {{
            const tbody = document.querySelector("#resultsTable tbody");
            tbody.innerHTML = "";

            const filtered = data.filter(row => {{
                const query = filterText.toLowerCase();
                return (
                    row.user_input.toLowerCase().includes(query) ||
                    row.response.toLowerCase().includes(query) ||
                    row.reference.toLowerCase().includes(query)
                );
            }});

            const start = (page - 1) * rowsPerPage;
            const end = start + rowsPerPage;
            const pageData = filtered.slice(start, end);

            pageData.forEach(row => {{
                const tr = document.createElement("tr");

                const userInputCell = document.createElement("td");
                userInputCell.textContent = row.user_input;
                tr.appendChild(userInputCell);

                const responseCell = document.createElement("td");
                responseCell.textContent = row.response;
                tr.appendChild(responseCell);

                const referenceCell = document.createElement("td");
                referenceCell.textContent = row.reference;
                tr.appendChild(referenceCell);

                const metrics = {json.dumps(metrics)};

                metrics.forEach(metric => {{
                    const cell = document.createElement("td");
                    const value = row[metric.name];

                    if (typeof value === "number") {{
                        cell.textContent = value.toFixed(4).replace(/\.?0+$/, "");
                    }} else {{
                        cell.textContent = value !== undefined ? value : "N/A";
                    }}

                    tr.appendChild(cell);
                }});

                tbody.appendChild(tr);
            }});

            renderPagination(filtered.length, page);
        }}

        function renderPagination(totalRows, currentPage) {{
            const pageCount = Math.ceil(totalRows / rowsPerPage);
            const pagination = document.getElementById("pagination");
            pagination.innerHTML = "";

            for (let i = 1; i <= pageCount; i++) {{
                const btn = document.createElement("button");
                btn.textContent = i;
                if (i === currentPage) {{
                    btn.classList.add("disabled");
                }} else {{
                    btn.onclick = () => {{
                        renderTable(document.getElementById("searchInput").value, i);
                    }};
                }}
                pagination.appendChild(btn);
            }}
        }}

        document.getElementById("searchInput").addEventListener("input", (e) => {{
            currentPage = 1;
            renderTable(e.target.value, currentPage);
        }});

        renderTable();
    </script>
</body>
</html>
"""
    return html

return generate_prompt_test_report_html(resultsDataframe, totalsDict, metrics)
}

}
