"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import Dropzone from "react-dropzone";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import ProductImgUpload from "../add-product/product-img-upload";
import useProductSubmit from "@/hooks/useProductSubmit";
import { useUploadImageMutation } from "@/redux/cloudinary/cloudinaryApi";

type Variation = {
  size: string;
  weight: number;
  price: number;
  frameType: string;
  image: string;
};

enum ProductStatus {
  active = 'active',
  inactive = 'inactive'
}

type Product = {
  sku: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
  tags?: string;
  variations: Variation[];
  status: ProductStatus
};

const BulkProductSubmit = () => {
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0); // Progress state
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // Processing state
  const { control, handleSubmit, setValue } = useForm<{ products: Product[] }>({
    defaultValues: { products: [] },
  });
  const { fields, append } = useFieldArray({ control, name: "products" });
  const { handleSubmitBulkProducts } = useProductSubmit();
  const [uploadImage] = useUploadImageMutation();

  const preprocessCSV = async (data: any[]) => {
    const groupedProducts: Record<string, Product> = {};
    const missingFields: string[] = [];
    const totalImages = data.length; // Total number of images to process
    let processedImages = 0; // Counter for processed images

    const processImage = async (url: string): Promise<string> => {
        if (!url) return "";
        try {
          const response = await fetch(url);
          const blob = await response.blob();          
          const file = new File([blob], "image.jpg", { type: blob.type });          

          const formData = new FormData();
          formData.append("image", file);
          const uploadData = await uploadImage(formData);
          
          if ('data' in uploadData) {
            const cloudinaryResponse = uploadData.data;
            console.log('cloudinaryResponse.data.url', cloudinaryResponse.data.url)
            return cloudinaryResponse.data.url;
          } else {
            console.error(`Error uploading image from ${url}:`);
            return '';
          }          
        } catch (error) {
          console.error(`Error uploading image from ${url}:`, error);
          return "";
        }
      };

    for (const row of data) {
      const handle = row.Handle;
      if (!handle) {
        missingFields.push(`Row ${data.indexOf(row) + 1}: Missing "Handle"`);
        continue;
      }

      if (!groupedProducts[handle]) {
        groupedProducts[handle] = {
          sku: row.SKU || `default-sku-${data.indexOf(row)}`,
          title: row.Title || `Untitled Product ${data.indexOf(row)}`,
          price: row["Variant Price"] || 0,
          quantity: row["Variant Inventory Qty"] || 0,
          image: "",
          tags: row.Tags || "",
          variations: [],
          status: row["Status"] === ProductStatus.active ? ProductStatus.active : ProductStatus.inactive
        };

        groupedProducts[handle].image = await processImage(row["Image Src"]);
      }

      groupedProducts[handle].variations.push({
        size: row["Option1 Value"] || "Default Size",
        weight: row["Variant Grams"] || 0,
        price: row["Variant Price"] || groupedProducts[handle].price,
        frameType: row["Option2 Value"] || "Default Frame",
        image: await processImage(row["Image Src"]),
      });
    }

    return { processedData: Object.values(groupedProducts), missingFields };
  };

  const handleDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file.name.endsWith(".csv")) {
      setErrors(["Please upload a valid CSV file"]);
      return;
    }

    setIsProcessing(true); // Start processing
    setProgress(0); // Reset progress

    const text = await file.text();
    Papa.parse<Product>(text, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        const parsedData = results.data as Product[];
        const { processedData, missingFields } = await preprocessCSV(parsedData);

        if (missingFields.length > 0) {
          setErrors(missingFields);
        } else {
          append(processedData);
          setErrors([]);
        }

        setIsProcessing(false); // End processing
      },
      error: (err: any) => {
        setErrors([`Error reading file: ${err.message}`]);
        setIsProcessing(false);
      },
    });
  };

  const handleBulkSubmit = async (data: { products: Product[] }) => {
    if (data.products.some(product => !product.image)) {
      setErrors(["Some products are missing images."]);
      return;
    }
    await handleSubmitBulkProducts(data.products);
  };

  return (
    <div className="bg-white p-6 rounded-md shadow-md">
      <h4 className="text-lg font-bold mb-4">Bulk Upload Products</h4>

      <Dropzone disabled={isProcessing} onDrop={handleDrop} accept={{ "text/csv": [".csv"] }}>
        {({ getRootProps, getInputProps }) => (
          <div
            {...getRootProps()}
            className={`border-dashed border-2 border-gray-400 p-6 rounded-md text-center ${isProcessing ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
          >
            <input {...getInputProps()} />
            <p>Drag and drop a CSV file here, or click to select a file</p>
          </div>
        )}
      </Dropzone>

      {/* Progress Indicator */}
      {isProcessing && (
        <div className="mt-4">
          <p>Processing images...</p>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-500 h-4 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-center text-sm mt-2">{progress}%</p>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-4 bg-red-100 text-red-700 p-3 rounded-md">
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {fields.length > 0 && (
        <form onSubmit={handleSubmit(handleBulkSubmit)} className="mt-6">
          <h5 className="font-semibold mb-2">Edit Products</h5>

          {fields.map((product, productIndex) => (
            <div key={product.id} className="mb-6">
              <h4 className="font-bold mb-2">{product.title}</h4>

              <div className="grid grid-cols-4 gap-4">
                <Controller
                  name={`products.${productIndex}.sku`}
                  control={control}
                  defaultValue={product.sku}
                  render={({ field }) => (
                    <input
                      {...field}
                      style={{ height: "40px" }}
                      className="w-full border rounded px-2"
                      placeholder="SKU"
                    />
                  )}
                />
                <Controller
                  name={`products.${productIndex}.price`}
                  control={control}
                  defaultValue={product.price}
                  render={({ field }) => (
                    <input
                      {...field}
                      style={{ height: "40px" }}
                      className="w-full border rounded px-2"
                      placeholder="Price"
                    />
                  )}
                />
                <Controller
                  name={`products.${productIndex}.quantity`}
                  control={control}
                  defaultValue={product.quantity}
                  render={({ field }) => (
                    <input
                      {...field}
                      style={{ height: "40px" }}
                      className="w-full border rounded px-2"
                      placeholder="Quantity"
                    />
                  )}
                />
                <ProductImgUpload
                  imgUrl={product.image}
                  setImgUrl={(url: string) =>
                    setValue(`products.${productIndex}.image`, url)
                  }
                  isSubmitted={false}
                />
              </div>
            </div>
          ))}

          <button type="submit" className="tp-btn px-5 py-2 mt-5">
            Submit Products
          </button>
        </form>
      )}
    </div>
  );
};

export default BulkProductSubmit;
