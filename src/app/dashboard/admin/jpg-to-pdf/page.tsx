"use client";

import React, { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { Card, Button, Input } from "@/components/ui";

interface SelectedImage {
  file: File;
  previewUrl: string;
}

const JpgToPdfPage: React.FC = () => {
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSizeMb = useMemo(() => {
    const totalBytes = selectedImages.reduce((sum, item) => sum + item.file.size, 0);
    return (totalBytes / (1024 * 1024)).toFixed(2);
  }, [selectedImages]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validImageFiles = files.filter((file) => {
      const mimeType = file.type.toLowerCase();
      return mimeType === "image/jpeg" || mimeType === "image/jpg" || mimeType === "image/png";
    });

    if (validImageFiles.length !== files.length) {
      setError("Only JPG/JPEG/PNG files are allowed.");
    } else {
      setError(null);
    }

    const mapped = validImageFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setSelectedImages((prev) => [...prev, ...mapped]);
    event.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (item) URL.revokeObjectURL(item.previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const clearAll = () => {
    selectedImages.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setSelectedImages([]);
    setError(null);
  };

  const readImageAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });
  };

  const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = dataUrl;
    });
  };

  const handleConvertToPdf = async () => {
    if (selectedImages.length === 0) {
      setError("Please select at least one image.");
      return;
    }

    setIsConverting(true);
    setError(null);

    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      for (let i = 0; i < selectedImages.length; i += 1) {
        const dataUrl = await readImageAsDataUrl(selectedImages[i].file);
        const { width, height } = await getImageDimensions(dataUrl);

        const widthRatio = usableWidth / width;
        const heightRatio = usableHeight / height;
        const scale = Math.min(widthRatio, heightRatio);

        const renderWidth = width * scale;
        const renderHeight = height * scale;
        const x = (pageWidth - renderWidth) / 2;
        const y = (pageHeight - renderHeight) / 2;

        if (i > 0) {
          pdf.addPage("a4", "portrait");
        }

        const imageFormat = selectedImages[i].file.type.toLowerCase() === "image/png" ? "PNG" : "JPEG";
        pdf.addImage(dataUrl, imageFormat, x, y, renderWidth, renderHeight, undefined, "FAST");
      }

      const fileName = `expenses-images-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (conversionError) {
      setError("Failed to convert images to PDF. Please try again.");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-4xl">🖼️</span>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Image to PDF</h1>
          <p className="text-gray-600">Upload JPG/JPEG/PNG receipts or photos and download a single PDF.</p>
        </div>
      </div>

      <Card>
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple onChange={handleFileChange} />
            <Button type="button" variant="outline" onClick={clearAll} disabled={selectedImages.length === 0}>
              Clear All
            </Button>
            <Button
              type="button"
              onClick={handleConvertToPdf}
              disabled={selectedImages.length === 0 || isConverting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isConverting ? "Converting..." : "Convert & Download PDF"}
            </Button>
          </div>

          <p className="text-sm text-gray-600">
            Selected: {selectedImages.length} image(s) | Total size: {totalSizeMb} MB
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-sm">{error}</div>
          )}

          {selectedImages.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedImages.map((item, index) => (
                <div key={`${item.file.name}-${index}`} className="border border-gray-200 rounded-md p-3">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="w-full h-40 object-cover rounded-md mb-2 bg-gray-50"
                  />
                  <p className="text-xs text-gray-700 truncate">{item.file.name}</p>
                  <p className="text-xs text-gray-500 mb-2">
                    {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleRemoveImage(index)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default JpgToPdfPage;
