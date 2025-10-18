"use client";

import { useState } from "react";
import { Upload, Code, Download, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function AdaptersPage() {
  const [sampleJson, setSampleJson] = useState('');
  const [toolName, setToolName] = useState('');
  const [inferring, setInferring] = useState(false);
  const [mapping, setMapping] = useState<any>(null);
  const [generatedCode, setGeneratedCode] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          setSampleJson(JSON.stringify(json, null, 2));
        } catch (error) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  const inferStructure = async () => {
    setInferring(true);
    setMapping(null);
    setGeneratedCode('');

    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const response = await fetch('https://uan-agent.ness.workers.dev/infer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sample_json: JSON.parse(sampleJson),
          tool_name: toolName || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMapping(data.data);
      } else {
        alert('Failed to infer structure');
      }
    } catch (error) {
      console.error('Error inferring structure:', error);
      alert('Error inferring structure');
    } finally {
      setInferring(false);
    }
  };

  const generateAdapter = async () => {
    if (!mapping) return;

    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const response = await fetch('https://uan-agent.ness.workers.dev/generate-adapter', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mapping }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedCode(data.data.code);
      } else {
        alert('Failed to generate adapter');
      }
    } catch (error) {
      console.error('Error generating adapter:', error);
      alert('Error generating adapter');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-medium text-[#EEF1F6]">
          <span>n</span><span className="text-[#00ADE8]">.</span><span>Solve</span> Universal Adapter
        </h1>
        <p className="text-[#9CA3AF] mt-2">Create adapters for unsupported tools using AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card className="bg-[#111317] border-[#1B2030]">
          <CardHeader>
            <CardTitle className="text-[#EEF1F6] flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#00ADE8]" />
              Step 1: Upload Sample JSON
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#EEF1F6]">Tool Name</Label>
              <Input
                placeholder="e.g., AG Capital Internal Scanner"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#EEF1F6]">Upload JSON Sample</Label>
              <Input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#EEF1F6]">Sample JSON</Label>
              <Textarea
                placeholder='{"findings": [{"name": "SQL Injection", "risk": "high"}]}'
                value={sampleJson}
                onChange={(e) => setSampleJson(e.target.value)}
                className="bg-[#0A0B0F] border-[#1B2030] text-[#EEF1F6] font-mono text-sm h-64"
              />
            </div>

            <Button
              onClick={inferStructure}
              disabled={!sampleJson || inferring}
              className="w-full bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {inferring ? 'Inferring with AI...' : 'Infer Structure'}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card className="bg-[#111317] border-[#1B2030]">
          <CardHeader>
            <CardTitle className="text-[#EEF1F6] flex items-center gap-2">
              <Code className="w-5 h-5 text-[#00ADE8]" />
              Step 2: Review Mapping
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mapping ? (
              <>
                <div className="bg-[#0A0B0F] p-4 rounded border border-[#1B2030]">
                  <p className="text-[#9CA3AF] text-sm mb-2">Parser Name:</p>
                  <p className="text-[#EEF1F6] font-mono">{mapping.nome_parser}</p>
                </div>

                <div className="bg-[#0A0B0F] p-4 rounded border border-[#1B2030] max-h-64 overflow-auto">
                  <p className="text-[#9CA3AF] text-sm mb-2">Field Mappings:</p>
                  <div className="space-y-2">
                    {mapping.mapa_campos.map((field: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="text-[#9CA3AF]">{field.input}</span>
                        <span className="text-[#00ADE8]">→</span>
                        <span className="text-[#EEF1F6]">{field.output_cdm}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={generateAdapter}
                  className="w-full bg-[#00ADE8] hover:bg-[#00ADE8]/80 text-white"
                >
                  <Code className="w-4 h-4 mr-2" />
                  Generate Adapter Code
                </Button>
              </>
            ) : (
              <div className="py-12 text-center">
                <AlertTriangle className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
                <p className="text-[#9CA3AF]">Upload a sample JSON to begin</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generated Code */}
      {generatedCode && (
        <Card className="bg-[#111317] border-[#1B2030]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#EEF1F6] flex items-center gap-2">
                <Code className="w-5 h-5 text-[#00ADE8]" />
                Step 3: Generated Adapter Code
              </CardTitle>
              <Button
                onClick={() => navigator.clipboard.writeText(generatedCode)}
                variant="outline"
                className="border-[#1B2030] text-[#EEF1F6]"
              >
                <Download className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-[#0A0B0F] p-4 rounded border border-[#1B2030] overflow-auto max-h-96 text-xs">
              <code className="text-[#EEF1F6] font-mono">{generatedCode}</code>
            </pre>
            <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded">
              <p className="text-blue-400 text-sm">
                📋 <strong>Next Steps:</strong>
              </p>
              <ol className="text-[#9CA3AF] text-sm mt-2 space-y-1 list-decimal list-inside">
                <li>Copy the generated code</li>
                <li>Save as: <code className="text-[#EEF1F6]">workers/inbound-receiver/adapters/{mapping.nome_parser}-adapter.ts</code></li>
                <li>Import in <code className="text-[#EEF1F6]">inbound-receiver/index.ts</code></li>
                <li>Deploy: <code className="text-[#EEF1F6]">wrangler deploy</code></li>
                <li>Test with: <code className="text-[#EEF1F6]">curl -X POST https://inbound-receiver.ness.workers.dev/webhook -H "X-Source-Tool: {mapping.nome_parser}"</code></li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

