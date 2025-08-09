"""
Files API router - Handles file management operations.

This module provides REST endpoints for creating, reading, updating,
and deleting text files.
"""

import os
import json
from typing import List, Dict, Any, Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import aiofiles

router = APIRouter()

# Directory for storing text files
TEXT_FILES_DIR = Path("text_files")
TEXT_FILES_DIR.mkdir(exist_ok=True)


class FileInfo(BaseModel):
    """Information about a text file."""
    filename: str
    size: int
    modified: Optional[str] = None
    created: Optional[str] = None
    

class FileContent(BaseModel):
    """Content of a text file."""
    filename: str
    content: str
    

class FileList(BaseModel):
    """List of files with metadata."""
    files: List[FileInfo]
    total: int


@router.get("/api/files", response_model=FileList)
async def list_files():
    """
    Get list of all text files.
    
    Returns:
        List of files with metadata
    """
    try:
        files = []
        
        for file_path in TEXT_FILES_DIR.glob("*.txt"):
            if file_path.is_file():
                stat = file_path.stat()
                files.append(FileInfo(
                    filename=file_path.name,
                    size=stat.st_size,
                    modified=str(stat.st_mtime),
                    created=str(stat.st_ctime)
                ))
        
        # Sort by filename
        files.sort(key=lambda f: f.filename)
        
        return FileList(files=files, total=len(files))
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")


@router.get("/api/files/{filename}", response_model=FileContent)
async def get_file(filename: str):
    """
    Get content of a specific file.
    
    Args:
        filename: Name of the file to retrieve
        
    Returns:
        File content
    """
    # Validate filename
    if not filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="Only .txt files are supported")
    
    file_path = TEXT_FILES_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            content = await f.read()
        
        return FileContent(filename=filename, content=content)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")


@router.post("/api/files/{filename}", response_model=Dict[str, Any])
async def create_or_update_file(filename: str, file_content: FileContent):
    """
    Create or update a text file.
    
    Args:
        filename: Name of the file to create/update
        file_content: File content data
        
    Returns:
        Success message with file info
    """
    # Validate filename
    if not filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="Only .txt files are supported")
    
    # Ensure filename matches the path parameter
    if file_content.filename != filename:
        raise HTTPException(status_code=400, detail="Filename mismatch")
    
    file_path = TEXT_FILES_DIR / filename
    
    try:
        async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
            await f.write(file_content.content)
        
        # Get file stats
        stat = file_path.stat()
        
        return {
            "success": True,
            "message": "File saved successfully",
            "filename": filename,
            "size": stat.st_size,
            "created": not file_path.exists(),  # This is after creation, so always False
            "modified": str(stat.st_mtime)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")


@router.delete("/api/files/{filename}")
async def delete_file(filename: str):
    """
    Delete a text file.
    
    Args:
        filename: Name of the file to delete
        
    Returns:
        Success message
    """
    # Validate filename
    if not filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="Only .txt files are supported")
    
    file_path = TEXT_FILES_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        file_path.unlink()
        
        return {
            "success": True,
            "message": "File deleted successfully", 
            "filename": filename
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")


@router.get("/api/files/{filename}/stats")
async def get_file_stats(filename: str):
    """
    Get detailed statistics for a file.
    
    Args:
        filename: Name of the file
        
    Returns:
        File statistics
    """
    # Validate filename  
    if not filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="Only .txt files are supported")
    
    file_path = TEXT_FILES_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            content = await f.read()
        
        # Calculate statistics
        lines = content.split('\n')
        words = len(content.split())
        characters = len(content)
        characters_no_spaces = len(content.replace(' ', ''))
        
        stat = file_path.stat()
        
        return {
            "filename": filename,
            "size_bytes": stat.st_size,
            "modified": str(stat.st_mtime),
            "created": str(stat.st_ctime),
            "lines": len(lines),
            "words": words,
            "characters": characters,
            "characters_no_spaces": characters_no_spaces,
            "paragraphs": len([line for line in lines if line.strip()]),
            "empty_lines": len([line for line in lines if not line.strip()])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get file stats: {str(e)}")


@router.post("/api/files/batch-create")
async def create_multiple_files(files: List[FileContent]):
    """
    Create multiple files at once.
    
    Args:
        files: List of file content objects
        
    Returns:
        Results for each file creation
    """
    results = []
    
    for file_data in files:
        try:
            # Validate filename
            if not file_data.filename.endswith('.txt'):
                results.append({
                    "filename": file_data.filename,
                    "success": False,
                    "error": "Only .txt files are supported"
                })
                continue
            
            file_path = TEXT_FILES_DIR / file_data.filename
            
            async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
                await f.write(file_data.content)
            
            stat = file_path.stat()
            
            results.append({
                "filename": file_data.filename,
                "success": True,
                "size": stat.st_size,
                "modified": str(stat.st_mtime)
            })
            
        except Exception as e:
            results.append({
                "filename": file_data.filename,
                "success": False,
                "error": str(e)
            })
    
    successful = sum(1 for r in results if r["success"])
    
    return {
        "total_files": len(files),
        "successful": successful,
        "failed": len(files) - successful,
        "results": results
    }