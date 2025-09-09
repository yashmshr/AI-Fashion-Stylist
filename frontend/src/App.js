import React, { useState, useRef, useCallback } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Upload, Camera, Sparkles, Palette, Shirt, Clock, Target, Lightbulb, Heart } from "lucide-react";
import { useToast } from "./hooks/use-toast";
import { Toaster } from "./components/ui/toaster";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FashionAnalyzer = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelection = (file) => {
    if (!file.type.includes('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload JPG, PNG, or HEIC images only",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setAnalysis(null);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API}/analyze-fashion`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setAnalysis(response.data.analysis);
        toast({
          title: "Analysis Complete!",
          description: "Your fashion photo has been analyzed successfully",
        });
      } else {
        throw new Error(response.data.error || "Analysis failed");
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.response?.data?.detail || error.message || "Please try again with a clearer fashion photo",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-6 w-6 text-rose-500" />
                  <span className="text-rose-500 font-medium">AI-Powered Fashion</span>
                </div>
                <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                  Your Personal
                  <span className="bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-transparent"> AI Stylist</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Upload any fashion photo and get instant AI-powered styling advice, color analysis, and personalized recommendations from your expert fashion assistant.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <Camera className="h-4 w-4 mr-2" />
                  Photo Analysis
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <Palette className="h-4 w-4 mr-2" />
                  Color Theory
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <Shirt className="h-4 w-4 mr-2" />
                  Style Advice
                </Badge>
              </div>
            </div>
            
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1686628101951-ce2bd65ab579?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHwxfHxBSSUyMGZhc2hpb24lMjBzdHlsaXN0fGVufDB8fHx8MTc1NzM5MjY1NHww&ixlib=rb-4.1.0&q=85"
                alt="Fashion styling"
                className="rounded-2xl shadow-2xl w-full h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Analysis Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-rose-500" />
                <span>Upload Fashion Photo</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragActive 
                    ? 'border-rose-500 bg-rose-50' 
                    : 'border-gray-300 hover:border-rose-400 hover:bg-rose-50/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {previewUrl ? (
                  <div className="space-y-4">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="max-h-48 mx-auto rounded-lg shadow-md"
                    />
                    <Button onClick={resetAnalysis} variant="outline" size="sm">
                      Choose Different Photo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Camera className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        Drop your fashion photo here
                      </p>
                      <p className="text-sm text-gray-500">
                        or click to browse (JPG, PNG, HEIC up to 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {selectedFile && (
                <Button 
                  onClick={analyzeImage} 
                  disabled={isAnalyzing}
                  className="w-full bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing Fashion...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze My Style
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          {analysis && (
            <div className="space-y-6">
              {/* Overall Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-purple-500" />
                    <span>Style Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Style Category</p>
                      <Badge variant="outline" className="mt-1">
                        {analysis.overall_analysis.style_category || 'Analyzed'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Formality</p>
                      <Badge variant="outline" className="mt-1">
                        {analysis.overall_analysis.formality_level || 'Determined'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Best Occasions</p>
                    <div className="flex flex-wrap gap-2">
                      {(analysis.occasion_recommendations || ['Versatile']).map((occasion, index) => (
                        <Badge key={index} variant="secondary">
                          {occasion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Color Palette */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Palette className="h-5 w-5 text-rose-500" />
                    <span>Color Palette</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(analysis.color_palette || ['Stylish colors detected']).map((color, index) => (
                      <Badge key={index} variant="outline" className="px-3 py-1">
                        {color}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Styling Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    <span>Expert Styling Tips</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(analysis.styling_tips || ['Professional styling advice provided']).map((tip, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-gradient-to-r from-rose-500 to-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-700 leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Clothing Pieces */}
              {analysis.clothing_pieces && analysis.clothing_pieces.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shirt className="h-5 w-5 text-blue-500" />
                      <span>Identified Items</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysis.clothing_pieces.map((piece, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 capitalize">
                              {piece.type || 'Fashion Item'}
                            </h4>
                            <Badge variant="outline">
                              {piece.style_category || 'Stylish'}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">
                            {piece.description || 'Fashion item analyzed'}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Fit: {piece.fit || 'Analyzed'}</span>
                            <span>Pattern: {piece.pattern || 'Detected'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Feature Showcase */}
        {!analysis && (
          <div className="mt-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                AI-Powered Fashion Analysis
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Upload any fashion photo and get comprehensive styling insights powered by advanced AI
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardContent className="pt-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Smart Analysis</h3>
                  <p className="text-gray-600">
                    AI identifies clothing pieces, colors, patterns and style elements with precision
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Palette className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Color Expertise</h3>
                  <p className="text-gray-600">
                    Professional color analysis and palette recommendations for your style
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lightbulb className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Expert Tips</h3>
                  <p className="text-gray-600">
                    Personalized styling advice and recommendations from AI fashion expert
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
      
      <Toaster />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FashionAnalyzer />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;