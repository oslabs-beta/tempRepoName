import React, { useState, useEffect } from "react";
import LineChart from "./LineChart";
import DonutChart from "./DonutChart";
import { FaSatelliteDish, FaFireAlt, FaBug, FaClock } from "react-icons/fa";
import { CustomError, ApiResponse, Xaxis, Functions } from "../rendererTypes";
import LoadingSpinner from "./LoadingSpinner";

const Dashboard: React.FC = () => {
  const [invocationsData, setInvocations] = useState<number[]>([]);
  const [invocationsDataLabels, setInvocationsLabels] = useState<string[]>([]);
  const [errorData, setErrors] = useState<number[]>([]);
  const [errorDataLabels, setErrorLabels] = useState<string[]>([]);
  const [throttleData, setThrottles] = useState<number[]>([]);
  const [throttleDataLabels, setThrottleDataLabels] = useState<string[]>([]);
  const [durationData, setDuration] = useState<number[]>([]);
  const [durationDataLabels, setDurationDataLabels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>();
  const [timePeriod, setTimePeriod] = useState<string>("86400"); // Default value: 1 day (seconds)
  const [dateRange, setDateRange] = useState<string>("2592000000"); // Default value: 1 month (milliseconds)
  const [xaxis, setXaxis] = useState<Xaxis>('day');
  const [functions, setFunctions] = useState<Functions>([]);
  const [selectedFunction, setSelectedFunction] = useState("");
  const [isFunctionInitialized, setIsFunctionInitialized] = useState<boolean>(false); 

  // function to calculate totals of each metric, using reduce to accumulate the values
  const calculateTotals = (data: number[]): number => {
    if (!data || !Array.isArray(data)) return 0;
    return data.reduce((total, current) => total + current, 0);
  }

  // function to calculate average of specific metric (duration)
  const calculateAverage = (data: number[]): number => {
    if (!data || !Array.isArray(data) || data.length === 0) return 0;
    const total = data.reduce((total, current) => total + current, 0);
    return total / data.length;
  }

  // function to get functions list
  const getFunctionList = async () => {
    try {
      const result = await window.api.getFunctionNameList();
      console.log('result is', result)
      if (result && Array.isArray(result)) {
        setFunctions(result);
      } else {
        throw new Error("Invalid data structure returned from getFunctionList");
      }
    } catch (error: any) {
      console.log("Error in get function list data", error);
    }
  };

  const getInvocationMetrics = async () => {
    try {      
      const result: ApiResponse<number[]> = await window.api.getInvocations(timePeriod, dateRange, selectedFunction);
      if (result && result.data && result.label) {
        setInvocations(result.data);
        setInvocationsLabels(result.label);
      } else {
        throw new Error('Invalid data structure returned from getInvocations');
      }
    } catch (error: any) {
      console.error("Error in dashboard invocation data:", error);
      setError(error.message);
    }
  };

  const getErrorMetrics = async () => {
    try {
      const result: ApiResponse<number[]> = await window.api.getErrors(timePeriod, dateRange, selectedFunction);
      console.log('Raw getErrors result:', result);
      if (result && result.data && result.label) {
        setErrors(result.data);
        setErrorLabels(result.label);
      } else {
        throw new Error('Invalid data structure returned from getErrors');
      }
    } catch (error: any) {
      console.error("Error in dashboard errors data:", error);
      setError(error.message);
    }
  };

  const getThrottleMetrics = async () => {
    try {
      const result: ApiResponse<number[]> = await window.api.getThrottles(timePeriod, dateRange, selectedFunction);
      console.log('Raw getThrottles result:', result);
      if (result && result.data && result.label) {
        setThrottles(result.data);
        setThrottleDataLabels(result.label);
      } else {
        throw new Error('Invalid data structure returned from getThrottle');
      }
    } catch (error: any) {
      console.error("Error in dashboard throttles data:", error);
      setError(error.message);
    }
  };

  const getDurationMetrics = async () => {
    try {
      const result: ApiResponse<number[]> = await window.api.getDuration(timePeriod, dateRange, selectedFunction);
      console.log('Raw getDuration result:', result);
      if (result && result.data && result.label) {
        setDuration(result.data);
        setDurationDataLabels(result.label);
      } else {
        throw new Error('Invalid data structure returned from getDuration');
      }
    } catch (error: any) {
      console.error("Error in dashboard duration data:", error);
      setError(error.message);
    }
  };

  // Get username 
  useEffect(() => {
    const getUserName = async() => {
      try {
        const result: ApiResponse<string> = await window.api.getUserName();
        setUserName(result.data);
      } catch (error: any) {
        console.error("Error to get user name in the dashboard");
        setError(error.message);
      }
    }
    getUserName();
  }, []);

  // Get function list 
  useEffect(() => {
    getFunctionList();
  }, []);

  // Set default function value to selectedFunction 
  useEffect(() => {
    console.log('Setting initial selected function:', functions[0]);
    setSelectedFunction(functions[0]);
    setIsFunctionInitialized(true);
  }, [functions])

  // Get each metric and set xaxis 
  useEffect(() => {
    const fetchData = async () => {
      // Only proceed if function is initialized
      if (!isFunctionInitialized || !selectedFunction) {
        console.log('Waiting for function initialization...');
        return;
      };

      setIsLoading(true);
      try {
        await Promise.all([getInvocationMetrics(), getErrorMetrics(), getThrottleMetrics(), getDurationMetrics()]);
        
        // set xaxis based on data range 
        if (Number(dateRange) <= 86400000) { // < 1 day
          setXaxis('hour');
        } else {
          setXaxis('day');
        }

      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timePeriod, dateRange, selectedFunction, isFunctionInitialized]);

  // Show 'loading' while waiting for data 
  if (isLoading) return <div><LoadingSpinner /></div>;
  if (error) return <div>Error: {error}</div>;

  // calculate the totals of each metric by passing in respective data into helper function
  const totalInvocations = calculateTotals(invocationsData);
  const totalErrors = calculateTotals(errorData);
  const totalThrottles = calculateTotals(throttleData);
  const averageDuration = calculateAverage(durationData);
  
  return (
    <div className="bg-base-100 min-h-screen text-base-content flex flex-col">
      {/* This wraps all content to make sure consistent padding and alignment */}
      <div className="w-full px-4 py-6">
        {/* Header Card */}
        <div className="card shadow-xl w-full bg-gradient-to-r from-primary via-secondary to-accent text-base-300 mb-8">
          <div className="card-body p-6">
            <p className="text-3xl">Welcome to Your Dashboard, {userName || 'User'}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 py-4">
      {/* Function names dropdown */}
        <div className="relative w-full max-w-[350px]">
          <select
            value={selectedFunction}
            onChange={(e) => setSelectedFunction(e.target.value)}
            className="select select-bordered w-full"
          >
          {functions.map((funcName, index) => (
            <option key={index} value={funcName}>
              {funcName}
            </option>
          ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
        {/* Total Invocations */}
        <div className="card bg-base-200 shadow-lg p-2 flex items-center space-x-2">
          <div className="flex items-center">
            <FaSatelliteDish className="text-blue-500 text-2xl mr-2" /> 
            <div>
              <p className="text-sm font-semibold mb-1">Total Invocations</p>
              <p className="text-xl font-bold">{totalInvocations}</p>
            </div>
          </div>
        </div>

        {/* Total Throttles */}
        <div className="card bg-base-200 shadow-lg p-2 flex items-center space-x-2">
          <div className="flex items-center">
            <FaFireAlt className="text-red-500 text-2xl mr-2" /> 
            <div>
              <p className="text-sm font-semibold mb-1">Total Throttles</p>
              <p className="text-xl font-bold">{totalThrottles}</p>
            </div>
          </div>
        </div>

        {/* Total Errors */}
        <div className="card bg-base-200 shadow-lg p-2 flex items-center space-x-2">
          <div className="flex items-center">
            <FaBug className="text-green-500 text-2xl mr-2" /> 
            <div>
              <p className="text-sm font-semibold mb-1">Total Errors</p>
              <p className="text-xl font-bold">{totalErrors}</p>
            </div>
          </div>
        </div>

        {/* Average Duration */}
        <div className="card bg-base-200 shadow-lg p-2 flex items-center space-x-2">
          <div className="flex items-center">
            <FaClock className="text-yellow-500 text-2xl mr-2" /> 
            <div>
              <p className="text-sm font-semibold mb-1">Average Duration</p>
              <p className="text-xl font-bold">{averageDuration.toFixed(2)} ms</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 px-4">
        {/* Time period dropdown */}  
        <div className="flex items-center gap-4">
          <p className="text-lg font-semibold mb-4">Period : </p>    
          <div className="relative w-full max-w-xs">
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as "3600" | "10800" | "43200" | "86400" )}
              className="select select-bordered w-full"
            >
              <option value="3600">1 Hour</option>
              <option value="10800">3 Hours</option>
              <option value="43200">12 Hours</option>
              <option value="86400">1 Day</option>
            </select>
          </div>
        </div>

        {/* Date range dropdown */}
        <div className="flex items-center gap-4">
          <p className="text-lg font-semibold mb-4">Date Range : </p>    
          <div className="relative w-full max-w-xs">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as "86400000" | "604800000" | "2592000000" )}
              className="select select-bordered w-full"
            >
              <option value="86400000">1 Day</option>
              <option value="604800000">1 Week</option>
              <option value="2592000000">1 Month</option>
            </select>
          </div>
        </div>

        {/* Invocations Chart */}
        <div className="card shadow-lg bg-base-200 p-6">
          <p className="text-lg font-semibold mb-4">Invocations</p>
          <div className="w-full h-72">
            <LineChart data={invocationsData} labels={invocationsDataLabels} xaxis={xaxis} />
          </div>
        </div>

        {/* Errors Chart */}
        <div className="card shadow-lg bg-base-200 p-6">
          <p className="text-lg font-semibold mb-4">Errors</p>
          <div className="w-full h-72">
            <LineChart data={errorData} labels={errorDataLabels}  xaxis={xaxis} />
          </div>
        </div>

        {/* Throttles Chart */}
        <div className="card shadow-lg bg-base-200 p-6">
          <p className="text-lg font-semibold mb-4">Throttles</p>
          <div className="w-full h-72">
            <LineChart data={throttleData} labels={throttleDataLabels}  xaxis={xaxis} />
          </div>
        </div>

        {/* Duration Chart */}
        <div className="card shadow-lg bg-base-200 p-6">
          <p className="text-lg font-semibold mb-4">Duration</p>
          <div className="w-full h-72">
            <LineChart data={durationData} labels={durationDataLabels}  xaxis={xaxis} />
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Dashboard;


  {/* Donut Chart Section */}
  {/* <div className="lg:w-1/2">
    <div className="card shadow-lg bg-base-200 p-6">
      <p className="text-lg font-semibold text-base-content mb-4">
        Invocations per Function
      </p>
      <div className="h-72 flex justify-center items-center">
        <DonutChart data={donutChartData} labels={donutChartLabels} />
      </div>
    </div>
  </div> */}