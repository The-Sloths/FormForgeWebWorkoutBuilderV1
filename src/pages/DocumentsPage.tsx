import React from "react";
import DocumentUpload from "@/components/document-upload";
import { useToast } from "@/components/ui/use-toast";

const DocumentsPage: React.FC = () => {
  const { toast } = useToast();

  const handleGeneratePlans = () => {
    toast({
      title: "Generate Plans",
      description: "This feature is not implemented yet.",
    });
  };

  return (
    <div className="min-h-screen">
      <header className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl font-bold">Gradatrim</h1>
          <p className="text-xl mt-2">Document Manager</p>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Upload Documents</h2>
          <p className="text-muted-foreground mb-8">
            Upload your PDF and Markdown files to generate workout plans. Drag
            and drop files or use the file browser.
          </p>

          <DocumentUpload onGeneratePlans={handleGeneratePlans} />
        </div>
      </main>
    </div>
  );
};

export default DocumentsPage;
