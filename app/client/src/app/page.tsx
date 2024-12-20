"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const [duration, setDuration] = useState(1);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState<"upload" | "download" | null>(
    null
  );

  useMovingBackground(backgroundRef);

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDuration(parseFloat(e.target.value));
  };

  const handleInputClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading("upload");
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("duration", duration.toString());

    const config = { headers: { "content-type": "multipart/form-data" } };
    axios
      .post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL_PROD}/upload`,
        formData,
        config
      )
      .then(({ data }) => {
        setCode(data.code);
      })
      .finally(() => {
        setIsLoading(null);
      });
  };

  const handleCodeDownload = () => {
    setError("");
    const code = codeInputRef.current?.value;
    if (!code) return;

    setIsLoading("download");

    return axios
      .get(`${process.env.NEXT_PUBLIC_BACKEND_URL_PROD}/${code}`)
      .then(({ data }) => {
        const url = data.file;
        const fileName = data.file.split("/").pop();
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => {
        setError("Wrong code");
      })
      .finally(() => {
        setIsLoading(null);
      });
  };

  return (
    <div className=" bg-network bg-cover bg-center" ref={backgroundRef}>
      <div className="bg-black/70 grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start sm:w-full lg:w-3/4 xl:w-1/2 bg-white bg-opacity-50 hover:bg-opacity-80 transition-colors backdrop-blur-md rounded-lg p-8 shadow-lg shadow-white/50">
          <span className="text-2xl font-bold font-mono w-full text-center mb-4">
            Temp file share
          </span>

          <div className="flex flex-col md:flex-row items-stretch gap-4 w-full">
            <div className="flex flex-col gap-4 border shadow shadow-black/50 border-gray-200 rounded-lg p-4 flex-1 justify-between  w-full">
              <span>Upload new file</span>
              <select
                className="border border-gray-200 rounded-lg px-2"
                value={duration}
                onChange={handleDurationChange}
              >
                <option value={3 / 60}>3 minutes</option>
                <option value="0.5">30 minutes</option>
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="3">3 hours</option>
                <option value="4">4 hours</option>
                <option value="24">24 hours</option>
              </select>
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2"
                onClick={handleInputClick}
                disabled={isLoading === "upload"}
              >
                {isLoading === "upload" ? "Uploading..." : "Upload"}
              </button>

              {code && (
                <div className="text-lg">
                  Your share code:{" "}
                  <code className="font-mono font-bold bg-gray-200 p-1 rounded">
                    {code}
                  </code>
                </div>
              )}
            </div>

            <span className="text-lg flex items-center">OR</span>

            <div className="flex flex-col gap-2 border shadow shadow-black/50 border-gray-200 rounded-lg p-4 flex-1 justify-between  w-full">
              <span>Paste a code to download files</span>
              <input
                type="text"
                className="border border-gray-200 rounded-lg px-2"
                placeholder="XXXX"
                ref={codeInputRef}
              />
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2"
                onClick={handleCodeDownload}
                disabled={isLoading === "download"}
              >
                {isLoading === "download" ? "Downloading..." : "Download"}
              </button>
              {error && <span className="text-red-500">{error}</span>}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const useMovingBackground = (
  backgroundRef: RefObject<HTMLDivElement | null>
) => {
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (backgroundRef.current) {
        const { clientX, clientY } = event;
        const { innerWidth, innerHeight } = window;

        const xPos = (clientX / innerWidth) * 20;
        const yPos = (clientY / innerHeight) * 20;

        backgroundRef.current.style.backgroundPosition = `calc(50% + ${xPos}px) calc(50% + ${yPos}px)`;
      }
    },
    [backgroundRef]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleMouseMove]);
};
