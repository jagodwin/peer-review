from flask import Flask, render_template, jsonify, request
import json

app = Flask(__name__)

# Load groups data from JSON file
def load_groups():
    with open('groups.json') as f:
        return json.load(f)

@app.route('/')
def rating_page():
    groups = load_groups()
    return render_template('rating.html', groups=groups)

@app.route('/get_members', methods=['POST'])
def get_members():
    groups = load_groups()
    group_name = request.json.get("group_name")
    print(f"Requested group: {group_name}")  # Debug print
    members = groups.get(group_name, [])
    print(f"Members returned: {members}")  # Debug print
    return jsonify(members)


if __name__ == '__main__':
    app.run(debug=True)

print(load_groups())
